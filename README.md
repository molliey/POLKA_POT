# Interactive Motion System

An interactive, physics-driven visual experience that transforms user input (mouse or hand gestures) into real-time motion feedback.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/07c49c7b-eca4-4b12-9c39-a735bd5abec1

## Overview

This project explores how motion, physics, and real-time interaction can enhance user experience beyond traditional UI components.

Instead of buttons or static layouts, users directly manipulate a dynamic visual field where elements respond naturally to input.

## Features

- **Real-time Interaction** — Supports both mouse and hand gesture input  
- **Physics-Based Motion** — Combines repulsion, spring dynamics, and damping  
- **Fluid Visual Feedback** — Creates smooth, organic motion across a structured grid  
- **Touchless Experience** — Optional hand tracking for natural interaction  
- **High Performance Rendering** — Optimized Canvas animation loop

## Tech Stack

- **Frontend**: React, TypeScript  
- **Rendering**: HTML5 Canvas  
- **Animation**: requestAnimationFrame  
- **Interaction**: Mouse Events, Hand Tracking  
- **Computer Vision**: MediaPipe Hands 

 ## Run

 ### Prerequisites

 - Node.js (v18+ recommended)

### Installation

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
