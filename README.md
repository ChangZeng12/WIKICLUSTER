# WIKICLUSTER

> **A minimalist, brutalist visualization of Wikipedia connections.**

Wikicluster is an interactive web application that visualizes the relationships between Wikipedia articles using a force-directed graph. It allows users to explore the "knowledge graph" by searching for topics, expanding connections, and navigating through the vast network of information in a clean, high-contrast interface.

## ✨ Features

-   **Interactive Force-Directed Graph**: Powered by **D3.js**, visualizing nodes (articles) and links (references) with physics-based interactions (drag, zoom, pan).
-   **Recursive Exploration**: Click on any "sub-node" to fetch its connections and expand the graph dynamically.
-   **Brutalist UI Design**: A strict black-and-white aesthetic using **Tailwind CSS**, featuring custom Phosphor icons and a utilitarian layout.
-   **Dynamic Link Control**: A custom-built rotary knob UI to limit or expand the number of fetched connections (150 - Infinity).
-   **Smart Search**: Real-time Wikipedia article search with auto-clearing and error handling.
-   **Wikipedia API Integration**: Direct integration with the MediaWiki API to fetch live content and summaries.

## 🛠️ Tech Stack

-   **Frontend**: React 19, TypeScript
-   **Visualization**: D3.js (v7)
-   **Styling**: Tailwind CSS
-   **Icons**: Phosphor Icons
-   **Fonts**: Inter & JetBrains Mono

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js installed on your machine.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/wikicluster.git
    cd wikicluster
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm start
    ```

4.  Open your browser and navigate to `http://localhost:3000` (or whatever port your bundler uses).

## 📖 Usage

1.  **Search**: Enter a topic in the top-left search bar (e.g., "Physics", "React (software)").
2.  **Explore**:
    *   **Main Nodes** (Black): The primary topics you have searched for or expanded.
    *   **Sub Nodes** (White): Articles linked from the main nodes.
3.  **Expand**: Click on any white sub-node to turn it into a main node and reveal its own connections.
4.  **Control**:
    *   Use the **Knob** in the sidebar to adjust the maximum number of links per fetch.
    *   Click **Reset View** to re-center the graph.
    *   Click **Trash Icon** (in search bar) to clear input.
    *   Click **Clear All** to wipe the canvas.

## 🎨 Design Philosophy

The project follows a **Brutalist** design philosophy:
*   High contrast (Black & White).
*   Raw, unadorned layout.
*   Monospaced typography for data and labels.
*   Function over decoration.

## 📄 License

This project is open source.

---

**Designed by [Chang Zeng](https://changz12.com/)**
