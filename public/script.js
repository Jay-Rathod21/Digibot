// ========================================
// DIGIBOT - FRONTEND CHAT CONTROLLER
// ========================================

const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");

const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const topClearBtn = document.getElementById("topClearBtn");

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const toastEl = document.getElementById("toast");

let conversation = [];
let busy = false;
let toastTimer;


// ========================================
// TOAST NOTIFICATION
// ========================================

function showToast(message) {

    toastEl.textContent = message;
    toastEl.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toastEl.classList.remove("show");
    }, 2500);

}


// ========================================
// SCROLL TO LATEST MESSAGE
// ========================================

function scrollToBottom() {

    const chatArea = document.getElementById("chatArea");

    chatArea.scrollTo({
        top: chatArea.scrollHeight,
        behavior: "smooth"
    });

}

// ========================================
// CODE BLOCK COPY BUTTONS
// ========================================

function addCodeCopyButtons(container) {

    container.querySelectorAll("pre").forEach(pre => {

        const code = pre.querySelector("code");

        if (!code) return;

        // Create wrapper
        const wrapper = document.createElement("div");
        wrapper.className = "code-block";

        // Code header
        const header = document.createElement("div");
        header.className = "code-header";

        // Detect programming language
        const languageClass = Array.from(code.classList)
            .find(className => className.startsWith("language-"));

        const language = languageClass
            ? languageClass.replace("language-", "")
            : "Code";

        const languageName = document.createElement("span");
        languageName.textContent = language;

        // Copy button
        const copyButton = document.createElement("button");
        copyButton.className = "code-copy-btn";
        copyButton.textContent = "Copy code";

        copyButton.addEventListener("click", async () => {

            try {

                await navigator.clipboard.writeText(code.textContent);

                copyButton.textContent = "Copied ✓";

                setTimeout(() => {
                    copyButton.textContent = "Copy code";
                }, 2000);

            } catch {

                showToast("Unable to copy code");

            }

        });

        header.append(languageName, copyButton);

        // Insert wrapper around code block
        pre.parentNode.insertBefore(wrapper, pre);

        wrapper.append(header, pre);

    });

}
// ========================================
// CREATE CHAT MESSAGE
// ========================================

function createMessage(role, text) {

    const wrapper = document.createElement("div");

    // Match the new CSS classes
    wrapper.className =
        role === "user"
            ? "message user-message"
            : "message bot-message";


    // Avatar
    const avatar = document.createElement("div");

    avatar.className =
        role === "user"
            ? "message-avatar user-avatar"
            : "message-avatar bot-avatar";

    avatar.textContent =
        role === "user"
            ? "Y"
            : "✦";


    // Message content
    const content = document.createElement("div");

    content.className = "message-content";


    // Message text
    const textEl = document.createElement("div");

    textEl.className = "message-text";

  if (role === "ai") {

    // Convert Markdown to HTML
    const markdownHTML = marked.parse(text, {
        gfm: true,
        breaks: true
    });

    // Sanitize HTML before displaying
    textEl.innerHTML = DOMPurify.sanitize(markdownHTML);

    // Make links open in a new tab safely
    textEl.querySelectorAll("a").forEach(link => {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    });

    // Add copy buttons to code blocks
    addCodeCopyButtons(textEl);

} else {

    // User messages remain plain text
    textEl.textContent = text;

}

content.appendChild(textEl);


    // Copy response button for AI
    if (role === "ai") {

        const copyBtn = document.createElement("button");

        copyBtn.className = "copy-btn";
        copyBtn.textContent = "▢ Copy";

        copyBtn.addEventListener("click", async () => {

            try {

                await navigator.clipboard.writeText(text);

                copyBtn.textContent = "✓ Copied";

                showToast("Response copied!");

                setTimeout(() => {
                    copyBtn.textContent = "▢ Copy";
                }, 2000);

            } catch {

                showToast("Unable to copy response");

            }

        });

        content.appendChild(copyBtn);

    }


    wrapper.append(avatar, content);

    messagesEl.appendChild(wrapper);

    scrollToBottom();

    return wrapper;

}


// ========================================
// TYPING ANIMATION
// ========================================

function showTyping() {

    const wrapper = document.createElement("div");

    wrapper.className = "message bot-message";
    wrapper.id = "typingMessage";


    // AI Avatar
    const avatar = document.createElement("div");

    avatar.className = "message-avatar bot-avatar";
    avatar.textContent = "✦";


    // Typing content
    const content = document.createElement("div");

    content.className = "message-content";


    // Animated dots
    const typing = document.createElement("div");

    typing.className = "typing-indicator";

    for (let i = 0; i < 3; i++) {

        const dot = document.createElement("span");

        typing.appendChild(dot);

    }

    content.appendChild(typing);

    wrapper.append(avatar, content);

    messagesEl.appendChild(wrapper);

    scrollToBottom();

}


// Remove typing animation

function hideTyping() {

    document.getElementById("typingMessage")?.remove();

}


// ========================================
// BUSY STATE
// ========================================

function setBusy(value) {

    busy = value;

    sendBtn.disabled = value;

    messageInput.disabled = value;

    sendBtn.textContent = value ? "..." : "↑";

}


// ========================================
// AUTO RESIZE TEXTAREA
// ========================================

function resizeInput() {

    messageInput.style.height = "auto";

    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 150) + "px";

}

messageInput.addEventListener("input", resizeInput);


// ========================================
// SEND MESSAGE
// ========================================

async function sendMessage(rawText) {

    const text = rawText.trim();

    if (!text) {

        showToast("Please type a message first.");

        return;

    }

    if (busy) return;


    // Hide welcome screen
    welcomeEl.hidden = true;


    // Display user message
    createMessage("user", text);


    // Save conversation
    conversation.push({
        role: "user",
        content: text
    });


    // Reset input
    messageInput.value = "";

    resizeInput();


    // Start loading
    setBusy(true);

    showTyping();


    try {

        // Send request to Node.js backend
        const response = await fetch("/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: conversation
            })

        });


        const data = await response.json();


        // Check API response
        if (!response.ok) {

            throw new Error(
                data.error || "Something went wrong"
            );

        }


        // Remove typing indicator
        hideTyping();


        // AI response
        const reply = data.reply;


        // Display AI response
        createMessage("ai", reply);


        // Save AI response
        conversation.push({
            role: "assistant",
            content: reply
        });


    } catch (error) {

        hideTyping();


        // Display error
        createMessage(
            "ai",
            "I'm sorry, I couldn't process your request.\n\n" +
            error.message +
            "\n\nPlease check your internet connection or server."
        );


        // Remove failed user message from history
        conversation.pop();


        showToast("Message failed");

        console.error("Chat error:", error);


    } finally {

        setBusy(false);

        messageInput.focus();

        scrollToBottom();

    }

}


// ========================================
// RESET CHAT
// ========================================

function resetChat() {

    if (busy) {

        showToast("Please wait for the current response.");

        return;

    }


    // Reset conversation
    conversation = [];


    // Remove messages
    messagesEl.replaceChildren();


    // Show welcome screen
    welcomeEl.hidden = false;


    // Reset input
    messageInput.value = "";

    resizeInput();


    // Close sidebar on mobile
    sidebar.classList.remove("open");


    showToast("New conversation started");

}


// ========================================
// FORM SUBMIT
// ========================================

chatForm.addEventListener("submit", (event) => {

    event.preventDefault();

    sendMessage(messageInput.value);

});


// ========================================
// ENTER KEY
// ========================================

messageInput.addEventListener("keydown", (event) => {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        chatForm.requestSubmit();

    }

});


// ========================================
// BUTTONS
// ========================================

newChatBtn.addEventListener("click", resetChat);

clearChatBtn.addEventListener("click", resetChat);

topClearBtn.addEventListener("click", resetChat);


// ========================================
// SUGGESTED PROMPTS
// ========================================

document.querySelectorAll("[data-prompt]").forEach(button => {

    button.addEventListener("click", () => {

        if (busy) return;

        sendMessage(button.dataset.prompt);

    });

});


// ========================================
// SIDEBAR TOPIC NAVIGATION
// ========================================

document.querySelectorAll("[data-topic]").forEach(button => {

    button.addEventListener("click", () => {

        if (busy) return;


        // Active button
        document.querySelectorAll("[data-topic]").forEach(item => {

            item.classList.remove("active");

        });

        button.classList.add("active");


        const topic = button.dataset.topic;


        // Dashboard
        if (topic === "Dashboard") {

            resetChat();

            return;

        }


        // Fill topic prompt
        messageInput.value =
            `Help me with ${topic}. Give me a beginner-friendly explanation and practical tips.`;


        messageInput.focus();

        resizeInput();


        // Close mobile sidebar
        sidebar.classList.remove("open");

    });

});


// ========================================
// MOBILE SIDEBAR
// ========================================

menuBtn.addEventListener("click", (event) => {

    event.stopPropagation();

    sidebar.classList.toggle("open");

});


// Close sidebar when clicking outside

document.addEventListener("click", (event) => {

    if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !menuBtn.contains(event.target)
    ) {

        sidebar.classList.remove("open");

    }

});


// ========================================
// INITIAL SETUP
// ========================================

resizeInput();

console.log("DigiBot UI initialized successfully!");