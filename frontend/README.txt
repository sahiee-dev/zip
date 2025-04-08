# Frontend Setup Instructions

## Manual Setup

1. Install Node.js 14.0 or higher from https://nodejs.org/

2. Install required packages:
   ```
   npm install
   ```

3. Start the frontend server:
   ```
   npm run dev
   ```

The application will be available at http://localhost:5173

## Troubleshooting

1. Port Already in Use:
   - If port 5173 is already in use, Vite will automatically try the next available port
   - Check the terminal output for the correct URL

2. Package Installation Issues:
   - Make sure you have Node.js and npm installed
   - Try running: `npm cache clean --force`
   - Then run: `npm install`

3. Browser Compatibility:
   - The application works best with Chrome, Firefox, or Edge
   - Make sure your browser is up to date
   - Enable JavaScript in your browser

4. Webcam/Microphone Access:
   - Allow camera and microphone access when prompted
   - Check browser settings if permissions are not requested
   - Make sure no other applications are using the camera/microphone

## Development Notes

- The application uses React with TypeScript
- Vite is used as the build tool
- Tailwind CSS is used for styling
- The default theme is dark mode 