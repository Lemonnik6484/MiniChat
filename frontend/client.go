package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"os/user"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const serverURL = "ws://"

var nickname = ""
var ipNickMap = make(map[string]string)
var historyPath = getHistoryPath()

const defaultPort = "8080"

var conn *websocket.Conn
var serverAddr string

func connect() {
	var err error
	serverURL := "ws://" + serverAddr
	conn, _, err = websocket.DefaultDialer.Dial(serverURL, nil)
	if err != nil {
		log.Fatal("Can't connect:", err)
	}
	go listen(conn)
}

func reconnect() {
	if conn != nil {
		conn.Close()
	}
	connect()
	if nickname != "" {
		conn.WriteMessage(websocket.TextMessage, []byte("N"+nickname))
	}
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: minichat <server-ip>[:port]")
		return
	}
	serverAddr = os.Args[1]
	if !strings.Contains(serverAddr, ":") {
		serverAddr += ":" + defaultPort
	}

	connect()

	scanner := bufio.NewScanner(os.Stdin)
	fmt.Print("> ")
	for scanner.Scan() {
		text := scanner.Text()
		if text == "" {
			fmt.Print("> ")
			continue
		}

		switch {
		case text == "/reconnect":
			fmt.Println("Reconnecting...")
			reconnect()
		case strings.HasPrefix(text, "/nick "):
			nick := strings.TrimSpace(strings.TrimPrefix(text, "/nick "))
			nickname = nick
			conn.WriteMessage(websocket.TextMessage, []byte("N"+nick))
		default:
			conn.WriteMessage(websocket.TextMessage, []byte("M"+text))
		}
		fmt.Print("> ")
	}
}

func listen(conn *websocket.Conn) {
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("disconnected:", err)
			return
		}
		parseAndPrint(string(msg))
	}
}

func parseAndPrint(raw string) {
	parts := strings.SplitN(raw, "|", 4)
	if len(parts) < 4 {
		return
	}
	timestamp, ip, typ, content := parts[0], parts[1], parts[2], parts[3]

	if typ == "N" && strings.HasPrefix(content, ip+" set name to ") {
		nick := strings.TrimPrefix(content, ip+" set name to ")
		ipNickMap[ip] = nick
	}

	displayName := ip
	if nick, ok := ipNickMap[ip]; ok {
		displayName = ip + "/" + nick
	}

	secs, _ := parseUnixTime(timestamp)
	timeStr := time.Unix(secs, 0).Format("15:04:05")

	if typ == "M" {
		fmt.Printf("\r[%s] %s: %s\n> ", timeStr, displayName, content)
		saveToHistory(timeStr, displayName, content)
	} else if typ == "N" && ip == "SYS" {
		fmt.Printf("\r[SYS] %s\n> ", content)
	}
}

func parseUnixTime(s string) (int64, error) {
	return strconv.ParseInt(s, 10, 64)
}

func saveToHistory(timeStr, from, content string) {
	f, err := os.OpenFile(historyPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	fmt.Fprintf(f, "[%s] %s: %s\n", timeStr, from, content)
}

func getHistoryPath() string {
	usr, err := user.Current()
	if err != nil {
		return "history.log"
	}
	return filepath.Join(usr.HomeDir, ".minichat_history")
}
