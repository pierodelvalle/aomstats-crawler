package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/jerkeeler/restoration/parser"
)

// Defaults match the docker-compose mount; override to run outside Docker.
var replaysDir = getEnv("REPLAYS_DIR", "/usr/src/app/replays")

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("GET /replays/{filename}", handleParseSaved)

	addr := ":" + getEnv("PORT", "8080")
	log.Printf("replay-server listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

// parseOptions maps ?pretty=true&slim=true&stats=true onto restoration's parser flags.
func parseOptions(r *http.Request) (pretty, slim, stats bool) {
	q := r.URL.Query()
	pretty = q.Get("pretty") == "true"
	slim = q.Get("slim") == "true"
	stats = q.Get("stats") == "true"
	return
}

// handleParseSaved parses a .mythrec(.gz) file that already lives in the mounted replays directory.
func handleParseSaved(w http.ResponseWriter, r *http.Request) {
	filename := r.PathValue("filename")
	if filename == "" || strings.ContainsAny(filename, "/\\") || strings.Contains(filename, "..") {
		http.Error(w, "invalid filename", http.StatusBadRequest)
		return
	}

	path := filepath.Join(replaysDir, filename)
	if _, err := os.Stat(path); err != nil {
		http.Error(w, "replay not found", http.StatusNotFound)
		return
	}

	pretty, slim, stats := parseOptions(r)
	isGzip := strings.HasSuffix(strings.ToLower(filename), ".gz")

	jsonStr, err := parser.ParseToJson(path, pretty, slim, stats, isGzip)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to parse replay: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, jsonStr)
}
