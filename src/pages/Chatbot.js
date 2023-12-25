// Install Axios if you haven't already: npm install axios
import React, { useState } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";

const ChatBox = () => {
  const [userInput, setUserInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  const sendMessage = async () => {
    if (userInput.trim() !== "") {
      // Append user's message to the chat
      const updatedChatMessages = [
        ...chatMessages,
        { role: "user", content: userInput },
      ];
      setChatMessages(updatedChatMessages);

      // Send user's message to the server
      try {
        const response = await axios.post("http://localhost:8000/completions", {
          message: userInput,
        });
        const aiResponse = response.data.response;

        // Append AI's response to the chat
        const updatedMessagesWithAI = [
          ...updatedChatMessages,
          { role: "assistant", content: aiResponse },
        ];
        setChatMessages(updatedMessagesWithAI);

        // Clear the user input
        setUserInput("");
      } catch (error) {
        console.error("Error:", error);
        // Handle error (e.g., display an error message in the chat)
      }
    }
  };
  return (
    <body class="flex flex-col items-center justify-center w-screen min-h-screen bg-stone-950 p-10">
      <div class="flex flex-col w-full flex-grow bg-blue-950 shadow-lg rounded-lg">
        <div class="flex-grow h-0 p-4 overflow-auto">
          <div class="text-white mt-2 space-x-3">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  message.role === "assistant" ? "ml-6" : "text-right ml-1"
                } ${message.content.length > 30 ? "long-message" : ""}`}
              >
                <span className="font-semibold">
                  {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
                  :
                </span>{" "}
                {message.role === "assistant" &&
                message.content.startsWith("```") &&
                message.content.endsWith("```") ? (
                  <div className="font-light">
                    <SyntaxHighlighter language="java" style={dracula}>
                      {message.content}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <div className="font-light">{message.content}</div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div class="bg-gray-300 p-4 flex rounded-b-md">
          <input
            type="text"me
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="flex items-center w-full h-10 px-3 text-sm bg-gray-300 rounded"
            placeholder="Type a message..."       
          />
          <FontAwesomeIcon
            icon={faPaperPlane}
            className="px-2 py-3 cursor-pointer"
            onClick={sendMessage}
            title="Send a message"
          />
        </div>
      </div>
    </body>
  );
};

export default ChatBox;
