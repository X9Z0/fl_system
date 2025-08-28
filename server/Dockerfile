FROM golang:1.23 AS build
WORKDIR /src 

COPY go.mod go.sum ./

RUN go mod download 

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/server . 

FROM gcr.io/distroless/base-debian11 

COPY --from=build /app/server /usr/local/bin/server

EXPOSE 50051

CMD ["/usr/local/bin/server"]
