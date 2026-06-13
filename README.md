# 🏃‍♂️ Subway Rush - Enhanced Edition

A lightweight, browser-based 3D endless runner game inspired by Subway Surfers. Built entirely from scratch using **HTML5 Canvas, CSS, and Vanilla JavaScript**—no external game engines or libraries!

![Game Preview](placeholder-for-screenshot.png) 

## 🌟 What's New in Enhanced Edition

* **🎵 Procedural Sound System:** Custom-built audio engine using the **Web Audio API**. Includes sound effects for running, jumping, sliding, coin collection, train horns, power-ups, and UI clicks (No external audio files needed!).

* **🛒 Interactive Shop & Inventory:** Collect coins during your run and spend them in the Main Menu Shop. Buy and store Power-ups for later use.

* **⚡ Active Power-Ups:** Deploy items from your inventory mid-run using on-screen buttons or keyboard shortcuts. Includes:
  * 🚀 **Jetpack:** Fly above the tracks safely.
  * 👟 **Super Sneakers:** Jump over high obstacles.
  * 🧲 **Coin Magnet:** Automatically attract nearby coins.
  * 🛹 **Hoverboard:** Grants a speed boost and a one-time crash protection!

* **💾 Persistent Storage:** High scores, total coins, and shop inventory are automatically saved to your browser's `localStorage`.

* **✨ Enhanced UI & Particles:** Polished Main Menu, Pause Menu, Game Over screens, and dynamic particle effects for jetpack trails and coin collection.

## 🎮 How to Play

### Movement Controls
**Desktop:**
* `Left Arrow` / `A` : Move Left
* `Right Arrow` / `D` : Move Right
* `Up Arrow` / `W` / `Space` : Jump
* `Down Arrow` / `S` : Slide/Roll
* `Esc` : Pause Game

**Mobile/Touch:**
* `Swipe Left/Right` : Change lanes
* `Swipe Up` : Jump
* `Swipe Down` : Slide

### Power-Up Controls (If available in Inventory)
* `Press 1` or `Tap 🛹 Icon` : Use Hoverboard
* `Press 2` or `Tap 🚀 Icon` : Use Jetpack
* `Press 3` or `Tap 👟 Icon` : Use Super Sneakers
* `Press 4` or `Tap 🧲 Icon` : Use Coin Magnet
* 
```

## 🚀 Installation & Running

Since the entire game and its assets (including procedural sounds) are contained within a single file, there is no complex setup or local server required:

1. Clone the repository:
   ```bash
   git clone [https://github.com/yourusername/subway-rush-clone.git](https://github.com/yourusername/subway-rush-clone.git)



2. Navigate to the project directory.
3. Simply open `index.html` in any modern web browser to start playing!

```

## 🛠️ Technical Architecture

The game logic is divided into modular JavaScript classes within the single file:

* **`SoundManager`:** Uses `AudioContext` to generate procedural sine/sawtooth waves and noise for game SFX.
* **`Renderer` & `Camera`:** Handles pseudo-3D math, projecting `Vector3` coordinates into 2D Canvas space with FOV and scaling.
* **`Player`:** Manages state machines (running, jumping, sliding), 3D limb animations, and power-up states.
* **`TrackSystem` & `ObstacleManager`:** Procedurally generates endless tracks, trains, overhead barriers, and decorative environments with AABB collision detection.
* **`Game` Engine:** The main loop that handles `requestAnimationFrame`, delta time scaling, UI state management, and `localStorage` saving/loading.

## 📝 License
This project is open-source and available under the MIT License.


## 🤝 Contributing

Contributions, suggestions, and feedback are welcome. Feel free to fork the repository and create a pull request.

## 👨‍💻 Author

Aryan Parmar

If you like this project, consider giving it a ⭐ on GitHub.
