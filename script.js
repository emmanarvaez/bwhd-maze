class MazeProgrammingApp {
    constructor() {
        this.canvas = document.getElementById('mazeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mazeImage = null;
        this.stationaryIconImage = null;
        this.characterImage = null;
        this.character = {
            x: 0, // Will be set based on grid position
            y: 0, // Will be set based on grid position
            angle: -Math.PI / 2, // Start facing upwards (pointing up)
            size: 20,
            color: '#ff6b6b'
        };
        this.trail = [];
        this.loopIndicators = []; // Store loop start positions
        this.isRunning = false;
        this.program = [];
        // Grid configuration used to place stationary icon
        this.gridCols = 30; // adjust if your maze grid differs
        this.gridRows = 30; // adjust if your maze grid differs
        this.openingCol = 5; // second cell from the left (0-based index)
        
        this.initializeEventListeners();
        this.setupClickToAdd();
        
        // Set up drag and drop after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.setupDragAndDrop();
        }, 100);
        
        this.createFixedMaze();
        
        // Set initial character position after a short delay to ensure canvas is sized
        setTimeout(() => {
            this.setCharacterStartPosition();
            this.trail = [{x: this.character.x, y: this.character.y}];
            this.drawMaze(); // Redraw to show the character in the correct position
        }, 100);

        // Keep canvas sized to container on resize
        window.addEventListener('resize', () => {
            this.resizeCanvasToContainer();
            this.drawMaze();
        });
    }

    initializeEventListeners() {
        document.getElementById('runBtn').addEventListener('click', () => {
            this.runProgram();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearProgram();
        });

        // Toggle blocks functionality
        document.getElementById('toggleBlocksBtn').addEventListener('click', () => {
            this.toggleBlocks();
        });
    }

    setupClickToAdd() {
        const blocks = document.querySelectorAll('.block');

        blocks.forEach(block => {
            block.addEventListener('click', (e) => {
                // Don't add to program if clicking within a loop content area
                if (e.target.closest('.loop-content')) {
                    return;
                }
                
                // Don't add to program if clicking on delete buttons
                if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
                    return;
                }
                
                // Don't add to program if clicking on number inputs
                if (e.target.classList.contains('number-input')) {
                    return;
                }
                
                const data = {
                    type: block.dataset.type,
                    content: block.innerHTML
                };
                
                // If it's a loop block, read the current number input value and loop content
                if (block.dataset.type === 'repeat') {
                    const numberInput = block.querySelector('.number-input');
                    if (numberInput) {
                        const currentValue = numberInput.value;
                        // Update the content to reflect the current value
                        data.content = data.content.replace(/value="\d+"/, `value="${currentValue}"`);
                    }
                    
                    // Capture the current loop content as data
                    const loopContent = block.querySelector('.loop-content');
                    const loopBlocks = loopContent ? loopContent.querySelectorAll('.loop-program-block') : [];
                    data.loopContent = [];
                    
                    console.log('=== CAPTURING LOOP CONTENT ===');
                    console.log('Found', loopBlocks.length, 'blocks in loop content');
                    
                    loopBlocks.forEach((loopBlock, index) => {
                        const blockType = loopBlock.dataset.type;
                        const blockText = loopBlock.querySelector('span')?.textContent || '';
                        console.log(`Loop block ${index}:`, { type: blockType, content: blockText });
                        data.loopContent.push({
                            type: blockType,
                            content: blockText
                        });
                    });
                    
                    console.log('Captured loop content:', data.loopContent);
                }
                
                this.addBlockToProgram(data);
            });
        });
    }

    setupDragAndDrop() {
        const blocks = document.querySelectorAll('.block');
        const programContainer = document.getElementById('programContainer');
        const loopContent = document.querySelector('.loop-content');

        console.log('Setting up drag and drop...');
        console.log('Blocks found:', blocks.length);
        console.log('Program container:', programContainer);
        console.log('Loop content:', loopContent);

        // Make blocks draggable
        blocks.forEach(block => {
            block.addEventListener('dragstart', (e) => {
                console.log('Drag started from:', block.dataset.type);
                
                let content = block.innerHTML;
                
                // If it's a loop block, read the current number input value
                if (block.dataset.type === 'repeat') {
                    const numberInput = block.querySelector('.number-input');
                    if (numberInput) {
                        const currentValue = numberInput.value;
                        // Update the content to reflect the current value
                        content = content.replace(/value="\d+"/, `value="${currentValue}"`);
                    }
                }
                
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: block.dataset.type,
                    content: content
                }));
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        // Program container drop zone
        if (programContainer) {
            programContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            programContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                console.log('Dropped on program container:', data);
                this.addBlockToProgram(data);
            });
        }

        // Loop content drop zone
        if (loopContent) {
            console.log('Setting up loop content drop zone');
            
            // Make sure the loop content can receive drops
            loopContent.setAttribute('data-drop-zone', 'true');
            
            loopContent.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                loopContent.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                console.log('Dragging over loop content');
            });

            loopContent.addEventListener('dragenter', (e) => {
                e.preventDefault();
                e.stopPropagation();
                loopContent.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                console.log('Entered loop content');
            });

            loopContent.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                // Only change background if we're actually leaving the loop content area
                if (!loopContent.contains(e.relatedTarget)) {
                    loopContent.style.backgroundColor = 'transparent';
                    console.log('Left loop content');
                }
            });

            loopContent.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                loopContent.style.backgroundColor = 'transparent';
                
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                console.log('Dropped on loop content:', data);
                this.addBlockToLoop(data);
            });
        } else {
            console.log('Loop content not found!');
        }
    }

    addBlockToLoop(data) {
        const loopContent = document.querySelector('.loop-content');
        
        // Create a new block element for the loop content
        const newBlock = document.createElement('div');
        newBlock.className = 'loop-program-block';
        newBlock.innerHTML = `
            <span>${data.content}</span>
            <button class="delete-btn" onclick="app.removeBlockFromLoop(this, event)">×</button>
        `;
        newBlock.dataset.type = data.type;
        
        // Remove the "Insert blocks here" text if it exists
        const insertText = loopContent.querySelector('.nested-block');
        if (insertText) {
            insertText.remove();
        }
        
        // Add the new block to the loop content
        loopContent.appendChild(newBlock);
    }

    removeBlockFromLoop(deleteButton, event) {
        // Stop event propagation to prevent triggering parent click events
        if (event) {
            event.stopPropagation();
        }
        
        const blockToRemove = deleteButton.parentElement;
        const loopContent = document.querySelector('.loop-content');
        
        // Remove the block
        blockToRemove.remove();
        
        // Check if there are any blocks left in the loop
        const remainingBlocks = loopContent.querySelectorAll('.loop-program-block');
        
        // If no blocks left, add back the "Insert blocks here" text
        if (remainingBlocks.length === 0) {
            const insertText = document.createElement('div');
            insertText.className = 'nested-block';
            insertText.innerHTML = '<span>Insert blocks here</span>';
            loopContent.appendChild(insertText);
        }
    }

    createFixedMaze() {
        // Load your maze image
        this.mazeImage = new Image();
        this.mazeImage.onload = () => {
            // Ensure canvas maintains 1:1 aspect ratio and fills container as much as possible
            this.resizeCanvasToContainer();
            
            // Draw the maze
            this.drawMaze();
        };
        this.mazeImage.src = 'maze.png';

        // Load stationary icon image (BWHD)
        this.stationaryIconImage = new Image();
        this.stationaryIconImage.onload = () => {
            // Redraw once the icon has finished loading so it appears immediately
            this.drawMaze();
        };
        this.stationaryIconImage.src = 'BWHD.png';

        // Load character image (Benson)
        this.characterImage = new Image();
        this.characterImage.onload = () => {
            // Redraw once the character image has finished loading
            this.drawMaze();
        };
        this.characterImage.src = 'benson.png';
    }

    resizeCanvasToContainer() {
        const container = this.canvas.parentElement;
        if (!container) return;

        // Compute the largest square that fits in the container
        const containerSize = Math.min(container.clientWidth, container.clientHeight);

        // Update canvas internal resolution
        this.canvas.width = containerSize;
        this.canvas.height = containerSize;

        // Also set CSS size so it visibly fills the container square
        this.canvas.style.width = containerSize + 'px';
        this.canvas.style.height = containerSize + 'px';
    }

    drawMaze() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw the maze image (without reloading) - maintain aspect ratio
        if (this.mazeImage) {
            // Calculate dimensions to maintain 1:1 aspect ratio
            const canvasSize = Math.min(this.canvas.width, this.canvas.height);
            const x = (this.canvas.width - canvasSize) / 2;
            const y = (this.canvas.height - canvasSize) / 2;
            
            this.ctx.drawImage(this.mazeImage, x, y, canvasSize, canvasSize);

            // Draw stationary icon (BWHD) centered above the opening in top row
            if (this.stationaryIconImage && this.stationaryIconImage.complete) {
                const cellSize = canvasSize / this.gridCols;
                const iconHeight = cellSize * 3; // scale relative to grid cell height
                const srcW = this.stationaryIconImage.naturalWidth || this.stationaryIconImage.width;
                const srcH = this.stationaryIconImage.naturalHeight || this.stationaryIconImage.height;
                const aspect = srcW / srcH;
                const iconWidth = iconHeight * aspect; // preserve original aspect ratio

                const openingCenterX = x + (this.openingCol * cellSize) + (cellSize / 2);
                let iconTopY = y - (iconHeight * 1.5); // slightly above the top border
                const iconLeftX = openingCenterX - (iconWidth / 2);

                if (iconTopY < 0) iconTopY = 30;

                this.ctx.drawImage(this.stationaryIconImage, iconLeftX, iconTopY, iconWidth, iconHeight);
            }
        }
        
        
        // Draw trail
        this.drawTrail();
        
        // Draw loop indicators
        this.drawLoopIndicators();
        
        // Draw character
        this.drawCharacter();
    }

    drawTrail() {
        if (this.trail.length < 2) return;

        this.ctx.strokeStyle = '#FA8D5D'; // Change this color to whatever you want
        this.ctx.lineWidth = 10;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(this.trail[0].x, this.trail[0].y);
        
        for (let i = 1; i < this.trail.length; i++) {
            this.ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        
        this.ctx.stroke();
    }

    drawLoopIndicators() {
        this.loopIndicators.forEach((indicator, index) => {
            this.ctx.save();
            this.ctx.translate(indicator.x, indicator.y);
            
            // Draw a swirl pattern
            this.ctx.strokeStyle = '#FF6B6B';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            
            const radius = 15;
            const turns = 2;
            
            this.ctx.beginPath();
            for (let i = 0; i <= 360 * turns; i += 5) {
                const angle = (i * Math.PI) / 180;
                const currentRadius = radius * (1 - i / (360 * turns));
                const x = Math.cos(angle) * currentRadius;
                const y = Math.sin(angle) * currentRadius;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
            
            // Add a small circle in the center
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add loop number
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText((index + 1).toString(), 0, -25);
            
            this.ctx.restore();
        });
    }

    drawCharacter() {
        if (this.characterImage && this.characterImage.complete) {
            this.ctx.save();
            this.ctx.translate(this.character.x, this.character.y);
            this.ctx.rotate(this.character.angle);
            
            // Draw Benson image
            const imageSize = this.character.size * 2; // Make it a bit larger
            this.ctx.drawImage(this.characterImage, -imageSize/2, -imageSize/2, imageSize, imageSize);
            
            this.ctx.restore();
        } else {
            // Fallback to triangle if image not loaded
            this.ctx.save();
            this.ctx.translate(this.character.x, this.character.y);
            this.ctx.rotate(this.character.angle);
            
            // Draw character as a triangle
            this.ctx.fillStyle = this.character.color;
            this.ctx.beginPath();
            this.ctx.moveTo(this.character.size, 0);
            this.ctx.lineTo(-this.character.size/2, -this.character.size/2);
            this.ctx.lineTo(-this.character.size/2, this.character.size/2);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Add a small circle for the "head"
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(this.character.size * 0.7, 0, this.character.size * 0.2, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    addBlockToProgram(blockData) {
        const programContainer = document.getElementById('programContainer');
        const dropHint = programContainer.querySelector('.drop-hint');
        if (dropHint) {
            dropHint.remove();
        }

        const blockElement = document.createElement('div');
        blockElement.className = 'program-block';
        
        // For loop blocks, create a proper display with the current number and inner content
        if (blockData.type === 'repeat') {
            // Extract the number from the content
            const numberMatch = blockData.content.match(/value="(\d+)"/);
            const currentNumber = numberMatch ? numberMatch[1] : '3';
            
            // Use the stored loop content instead of reading from original loop block
            const loopContent = blockData.loopContent || [];
            
            // Create inner content display
            let innerContentHtml = '';
            if (loopContent.length > 0) {
                innerContentHtml = '<div class="loop-inner-content">';
                loopContent.forEach(block => {
                    innerContentHtml += `<div class="inner-block">${block.content}</div>`;
                });
                innerContentHtml += '</div>';
            } else {
                innerContentHtml = '<div class="loop-inner-content"><div class="inner-block">No instructions</div></div>';
            }
            
            blockElement.className = 'program-block repeat-block';
            blockElement.innerHTML = `
                <div class="repeat-header">
                    <span>Loop ${currentNumber} times</span>
                    <button class="delete-btn" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                ${innerContentHtml}
            `;
        } else {
            // For other blocks, use the original content
            blockElement.innerHTML = `
                <span>${blockData.content}</span>
                <button class="delete-btn" onclick="this.parentElement.remove()">×</button>
            `;
        }
        
        programContainer.appendChild(blockElement);
        
        // Store block data
        this.program.push(blockData);
        console.log('=== ADDED BLOCK TO PROGRAM ===');
        console.log('Added block:', blockData);
        console.log('Program now has', this.program.length, 'blocks');
        console.log('Current program array:', this.program);
    }

    async runProgram() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        document.getElementById('runBtn').textContent = 'Running...';
        document.getElementById('runBtn').disabled = true;

        // Automatically clear trail and reset character position
        this.clearTrail();

        console.log('=== PROGRAM EXECUTION DEBUG ===');
        console.log('Program array:', this.program);
        console.log('Program array length:', this.program.length);
        
        // Log each block with its index
        this.program.forEach((block, index) => {
            console.log(`Block ${index}:`, block);
        });
        
        console.log('=== EXECUTING IN NORMAL ORDER ===');
        
        for (let i = 0; i < this.program.length; i++) {
            if (!this.isRunning) break;
            
            const block = this.program[i];
            console.log(`EXECUTING block ${i + 1}:`, block);
            
            await this.executeBlock(block);
            this.drawMaze();
            await this.delay(100);
        }

        this.isRunning = false;
        document.getElementById('runBtn').textContent = 'Run Program';
        document.getElementById('runBtn').disabled = false;
    }

    async executeBlock(block) {
        switch (block.type) {
            case 'move-forward':
                await this.moveForward();
                break;
            case 'turn-left':
                this.turnLeft();
                break;
            case 'turn-right':
                this.turnRight();
                break;
            case 'wait':
                const waitTime = block.content.match(/value="(\d+)"/)?.[1] || 500;
                await this.delay(parseInt(waitTime));
                break;
            case 'repeat':
                const repeatCount = block.content.match(/value="(\d+)"/)?.[1] || 3;
                await this.repeatBlocks(parseInt(repeatCount), block.loopContent);
                break;
        }
    }

    async moveForward() {
        const distance = 52;
        const newX = this.character.x + Math.cos(this.character.angle) * distance;
        const newY = this.character.y + Math.sin(this.character.angle) * distance;
        
        // Keep character within canvas bounds
        this.character.x = Math.max(this.character.size, Math.min(this.canvas.width - this.character.size, newX));
        this.character.y = Math.max(this.character.size, Math.min(this.canvas.height - this.character.size, newY));
        
        this.trail.push({x: this.character.x, y: this.character.y});
        
        console.log('Moving forward - angle:', this.character.angle, 'degrees:', this.character.angle * 180 / Math.PI, 'cos:', Math.cos(this.character.angle), 'sin:', Math.sin(this.character.angle), 'new position:', this.character.x, this.character.y);
    }

    turnLeft() {
        const oldAngle = this.character.angle;
        this.character.angle -= Math.PI / 2;
        console.log('Turned left - old angle:', oldAngle, 'new angle:', this.character.angle, 'degrees:', this.character.angle * 180 / Math.PI);
    }

    turnRight() {
        const oldAngle = this.character.angle;
        this.character.angle += Math.PI / 2;
        console.log('Turned right - old angle:', oldAngle, 'new angle:', this.character.angle, 'degrees:', this.character.angle * 180 / Math.PI);
    }

    async repeatBlocks(count, loopContentData = null) {
        console.log('=== EXECUTING LOOP ===');
        console.log('Starting loop with', count, 'iterations');
        console.log('Loop content data provided:', loopContentData);
        
        // Use provided loop content data or fall back to DOM reading
        let loopBlocks = [];
        if (loopContentData && loopContentData.length > 0) {
            console.log('Using provided loop content data');
            loopBlocks = loopContentData;
        } else {
            console.log('Falling back to DOM reading');
            // Fallback to DOM reading (for backward compatibility)
            const loopContent = document.querySelector('.loop-content');
            const domLoopBlocks = loopContent ? loopContent.querySelectorAll('.loop-program-block') : [];
            loopBlocks = Array.from(domLoopBlocks).map(blockElement => ({
                type: blockElement.dataset.type,
                content: blockElement.querySelector('span')?.textContent || ''
            }));
        }
        
        console.log('Found', loopBlocks.length, 'blocks in loop');
        
        // Execute the loop the specified number of times
        for (let i = 0; i < count; i++) {
            console.log('Loop iteration', i + 1);
            
            // Add loop indicator at the start of each iteration
            this.loopIndicators.push({
                x: this.character.x,
                y: this.character.y,
                iteration: i + 1
            });
            this.drawMaze();
            await this.delay(300); // Pause to show the indicator
            
            // Execute each block in the loop
            for (const blockData of loopBlocks) {
                if (!this.isRunning) break;
                
                console.log('Executing block:', blockData.type, 'content:', blockData.content);
                
                // Create block data for execution
                const executionBlockData = { type: blockData.type };
                if (blockData.type === 'wait') {
                    // For wait blocks, we need to extract the time value
                    const timeMatch = blockData.content.match(/(\d+)/);
                    if (timeMatch) {
                        executionBlockData.content = `value="${timeMatch[1]}"`;
                    }
                }
                
                await this.executeBlock(executionBlockData);
                this.drawMaze();
                await this.delay(200);
            }
        }
    }

    clearTrail() {
        this.trail = [];
        this.loopIndicators = [];
        this.setCharacterStartPosition();
        this.character.angle = -Math.PI / 2; // Start facing upwards
        this.trail.push({x: this.character.x, y: this.character.y});
        this.drawMaze();
    }

    clearProgram() {
        // Clear the program array
        this.program = [];
        
        // Clear the program container
        const programContainer = document.getElementById('programContainer');
        programContainer.innerHTML = '<p class="drop-hint">Click blocks to add them to your program</p>';
        
        // Also clear the trail and reset character
        this.clearTrail();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setCharacterStartPosition() {
        // Calculate position: bottom left corner, 4 grid squares to the right
        const canvasSize = Math.min(this.canvas.width, this.canvas.height);
        const cellSize = canvasSize / this.gridCols;
        const x = (this.canvas.width - canvasSize) / 2;
        const y = (this.canvas.height - canvasSize) / 2;
        
        // Position at bottom left, 4 cells to the right
        this.character.x = 130 + x + (4 * cellSize) + (cellSize / 2);
        this.character.y = y + canvasSize - (cellSize / 2) - 60; // Bottom of the maze
        
        console.log('Character position set to:', this.character.x, this.character.y);
        console.log('Canvas size:', canvasSize, 'Cell size:', cellSize);
        console.log('Maze offset:', x, y);
    }


    toggleBlocks() {
        const blocksSection = document.getElementById('blocksSection');
        const toggleBtn = document.getElementById('toggleBlocksBtn');
        const programmingSection = document.querySelector('.programming-section');
        
        if (blocksSection.classList.contains('hidden')) {
            blocksSection.classList.remove('hidden');
            programmingSection.classList.remove('blocks-hidden');
            toggleBtn.textContent = 'Hide Blocks';
        } else {
            blocksSection.classList.add('hidden');
            programmingSection.classList.add('blocks-hidden');
            toggleBtn.textContent = 'Show Blocks';
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MazeProgrammingApp();
});
