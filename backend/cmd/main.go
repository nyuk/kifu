package main

import (
	"log"

	"github.com/moneyvessel/kifu/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
