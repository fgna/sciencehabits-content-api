#!/usr/bin/env python3
"""
Simple CORS-enabled HTTP server for development
Serves content from src/content directory with CORS headers
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')  # Cache preflight for 24 hours
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Log requests for debugging
        print(f"GET request: {self.path}")
        super().do_GET()

if __name__ == "__main__":
    PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    DIRECTORY = "src/content"
    
    # Change to content directory
    if os.path.exists(DIRECTORY):
        os.chdir(DIRECTORY)
        print(f"Serving content from: {os.getcwd()}")
    else:
        print(f"Error: Directory {DIRECTORY} not found")
        sys.exit(1)

    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        print(f"CORS-enabled server running at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")