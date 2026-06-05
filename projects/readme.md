Refactor my portfolio projects system to use a separate folder for each project's screenshots instead of storing all images in a single folder.

Current structure:

assets/images/projects/
├── queuelk-1.png
├── queuelk-2.png
├── helpinhand-1.png
├── helpinhand-2.png

New structure:

assets/images/projects/
├── queuelk/
│   ├── 1.png
│   ├── 2.png
│   ├── 3.png
│   ├── 4.png
│   ├── 5.png
│
├── helpinhand/
│   ├── 1.png
│   ├── 2.png
│   ├── 3.png
│
├── myquote/
├── pitre/
├── tictactoe/
├── guessgame/
├── wordgame/
├── cdictionary/
└── portfolio/

Requirements:

1. Update projects.json and fallback data to use:
   {
   "folder": "queuelk",
   "images": ["1","2","3","4","5"]
   }

2. Update slideshow image loading to:
   /assets/images/projects/${project.folder}/${image}.png

3. Update lightbox image loading to:
   /assets/images/projects/${project.folder}/${image}.png

4. Keep all existing functionality:

   * slideshow
   * next/previous buttons
   * dots navigation
   * lightbox modal
   * View Screenshots button
   * image click-to-expand

5. Support unlimited screenshots per project (5, 10, 20, or more).

6. Automatically generate dots, counters, thumbnails, and navigation based on the length of the images array.

7. Do not hardcode any image count.

8. Keep GitHub Pages compatibility.

9. Return the complete updated JavaScript code sections that need modification.

10. Ensure all project cards remain the same height and keep the View Screenshots and GitHub buttons aligned at the bottom of every card.
