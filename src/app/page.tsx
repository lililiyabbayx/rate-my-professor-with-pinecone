"use client";
import { useState, useEffect, useRef } from "react";
import { Box, Button, Stack, TextField } from "@mui/material";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null); // Reference to the end of the messages

  const sendMessage = async () => {
    if (!message.trim()) return; // Avoid sending empty messages

    const newMessage = { role: "user", content: message };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([...messages, newMessage]),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resultText = await response.text(); // Use .text() if the response is plain text
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: resultText },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      // Handle error (e.g., show a user-friendly message)
    }
  };

  useEffect(() => {
    // Scroll to the bottom of the messages container whenever messages change
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Box
      width="100vw" // Full viewport width
      height="100vh" // Full viewport height
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#1F1F1F" // Background color for the whole chat area
    >
      <Stack
        direction="column"
        width="600px" // Width of the chat box
        height="600px" // Height of the chat box
        border="1px solid BLUE" // Border around the chat box
        borderRadius={2} // Rounded corners for the chat box
        p={2} // Padding inside the chat box
        spacing={3} // Spacing between elements inside the chat box
        bgcolor="#69EB95" // Background color for the chat box
      >
        <Stack
          direction="column"
          spacing={4} // Spacing between messages
          flexGrow={1} // Allow the chat area to grow and fill available space
          overflow="auto" // Enable scrolling when content overflows
          maxHeight="100%" // Max height for the chat area
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === "assistant" ? "flex-start" : "flex-end"
              } // Align messages left for assistant, right for user
            >
              <Box
                bgcolor={message.role === "assistant" ? "#e0f7fa" : "#007bff"} // Light blue for assistant, dark blue for user
                color={message.role === "assistant" ? "black" : "white"} // Black text for assistant, white text for user
                borderRadius={6} // Rounded corners for message bubbles
                p={2} // Padding inside message bubbles
                maxWidth="95%" // Max width for message bubbles
              >
                {message.content}
              </Box>
            </Box>
          ))}
          {/* This empty div will be used to scroll to the bottom */}
          <div ref={endOfMessagesRef} />
        </Stack>
        <Stack direction="row" spacing={2}>
          {" "}
          {/* Row for input field and send button */}
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            variant="outlined"
            sx={{ bgcolor: "#F6F6F6", borderRadius: 2, padding: "8px" }} // Background color and padding for the input field
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            sx={{ bgcolor: "#034387", color: "#0AE8D6", padding: "8px 16px" }} // Background color, text color, and padding for the send button
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
