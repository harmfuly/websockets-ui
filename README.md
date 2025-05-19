# RSSchool NodeJS websocket task template
> Static http server and base task packages. 
> By default WebSocket client tries to connect to the 3000 port.

## Installation
1. Clone/download repo
2. `npm install`

## Usage
**Development**

`npm run start:dev`

* App served @ `http://localhost:8181` with nodemon

**Production**

`npm run start`

* App served @ `http://localhost:8181` without nodemon

---

**All commands**

Command | Description
--- | ---
`npm run start:dev` | App served @ `http://localhost:8181` with nodemon
`npm run start` | App served @ `http://localhost:8181` without nodemon

**Note**: replace `npm` with `yarn` in `package.json` if you use yarn.

## Troubleshooting WebSocket Messages Visibility

### Issue: Not seeing all messages in the browser's Network tab under "Messages"

If you notice that **not all WebSocket messages appear** in the Network tab → Messages section of your browser's developer tools, try the following:

1. **Check the Console for Errors**

   Often, the reason some messages don't show properly is because your client-side code is throwing errors when processing incoming messages. For example, if your code tries to parse JSON that is already parsed (or not valid JSON), it will cause exceptions. These errors can interrupt the message handling and prevent further messages from being logged or displayed correctly.

2. **Why This Happens**

   - The Network tab shows raw WebSocket frames sent and received.
   - However, if your JavaScript code crashes while handling a message (e.g., due to `JSON.parse` errors), the message event handler may stop processing further messages or log incomplete info.
   - Some browsers may optimize or filter the display of WebSocket messages when errors occur in your event handlers.
   - Therefore, **the Network tab might not fully reflect all received messages if your code is buggy or crashes during message handling**.

### What To Do

- Always check the **Console tab** for any parsing or runtime errors.
- Fix errors in your message handling code (for example, avoid double-parsing JSON strings).
- Ensure that your WebSocket event handlers handle all messages gracefully, including unexpected or malformed data.
- Once errors are fixed, the Network tab should correctly display all messages.

---

This will help you debug and understand why some WebSocket messages might be missing or not showing as expected.

