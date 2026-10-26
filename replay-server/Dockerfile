# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o replay-server .

# Runtime stage
FROM alpine:3.20

WORKDIR /usr/src/app

COPY --from=builder /build/replay-server ./replay-server

EXPOSE 8080

CMD ["./replay-server"]
