// 播放器核心功能
class MusicPlayer {
    constructor() {
        // 音频相关
        this.audio = document.getElementById('audio-player');
        this.playBtn = document.getElementById('play-btn');
        this.playIcon = document.getElementById('play-icon');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.progressBar = document.getElementById('progress-bar');
        this.progress = document.getElementById('progress');
        this.progressThumb = document.getElementById('progress-thumb');
        this.currentTimeEl = document.getElementById('current-time');
        this.durationEl = document.getElementById('duration');
        this.volumeSlider = document.getElementById('volume-slider');
        this.muteBtn = document.getElementById('mute-btn');
        this.volumeIcon = document.getElementById('volume-icon');
        this.speedSelect = document.getElementById('speed-select');
        
        // 歌词相关
        this.lyricsDisplay = document.getElementById('lyrics-display');
        this.lyrics = [];
        this.currentLyricIndex = 0;
        this.isUserScrolling = false;
        this.scrollTimeout = null;
        this.lyricElements = [];
        
        // 可视化相关
        this.canvas = document.getElementById('visualizer');
        this.canvasCtx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.animationId = null;
        this.visualizerBars = [];
        this.visualizerAnimation = null;
        
        // 文件选择
        this.musicFileInput = document.getElementById('music-file');
        this.lyricsFileInput = document.getElementById('lyrics-file');
        this.musicFileName = document.getElementById('music-file-name');
        this.lyricsFileName = document.getElementById('lyrics-file-name');
        this.loadSampleBtn = document.getElementById('load-sample');
        
        // 播放列表
        this.playlist = [
            {
                title: 'White Night',
                artist: '白夜',
                album: '单曲',
                mp3: 'uploads/White_Night.mp3',
                lrc: 'uploads/White_Night.lrc'
            }
        ];
        this.currentTrackIndex = 0;
        
        // 动画相关
        this.rafId = null;
        this.lastUpdateTime = 0;
        this.progressAnimationId = null;
        
        // 初始化
        this.init();
    }
    
    init() {
        // 设置画布尺寸
        this.setCanvasSize();
        window.addEventListener('resize', () => {
            this.setCanvasSize();
            this.initVisualizerBars();
        });
        
        // 绑定事件
        this.bindEvents();
        
        // 自动加载第一首歌
        setTimeout(() => this.loadTrack(0), 100);
    }
    
    setCanvasSize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    
    initVisualizerBars() {
        this.visualizerBars = [];
        const barCount = 64;
        for (let i = 0; i < barCount; i++) {
            this.visualizerBars.push({
                height: 0,
                targetHeight: 0,
                speed: 0.1 + Math.random() * 0.2
            });
        }
    }
    
    bindEvents() {
        // 播放/暂停
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.audio.addEventListener('play', () => {
            this.updatePlayButton(true);
            this.animateProgress();
        });
        this.audio.addEventListener('pause', () => {
            this.updatePlayButton(false);
            this.stopProgressAnimation();
        });
        
        // 进度条控制
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        this.progressBar.addEventListener('mousedown', (e) => this.startDragging(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDragging());
        
        // 音量控制
        this.volumeSlider.addEventListener('input', () => this.updateVolume());
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        
        // 播放速度
        this.speedSelect.addEventListener('change', () => this.updateSpeed());
        
        // 歌词高亮
        this.audio.addEventListener('timeupdate', () => {
            requestAnimationFrame(() => {
                this.updateProgress();
                this.highlightLyrics();
            });
        });
        
        // 文件上传
        this.musicFileInput.addEventListener('change', (e) => this.loadMusicFile(e));
        this.lyricsFileInput.addEventListener('change', (e) => this.loadLyricsFile(e));
        this.loadSampleBtn.addEventListener('click', () => this.loadDefaultTrack());
        
        // 切歌按钮
        this.prevBtn.addEventListener('click', () => this.prevTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        
        // 音频加载完成时更新信息
        this.audio.addEventListener('loadeddata', () => {
            this.updateDuration();
        });
        
        // 新增：监听歌词区域滚动事件
        this.lyricsDisplay.addEventListener('scroll', () => {
            this.handleLyricsScroll();
        });
        
        // 新增：阻止歌词区域滚轮事件冒泡
        this.lyricsDisplay.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: false });
        
        // 新增：点击歌词跳转到对应时间
        this.lyricsDisplay.addEventListener('click', (e) => {
            const lyricLine = e.target.closest('.lyric-line');
            if (lyricLine) {
                const index = parseInt(lyricLine.dataset.index);
                if (!isNaN(index) && this.lyrics[index]) {
                    this.audio.currentTime = this.lyrics[index].time;
                    this.audio.play().catch(console.error);
                }
            }
        });
        
        // 新增：鼠标悬停效果
        this.progressBar.addEventListener('mouseenter', () => {
            this.progressThumb.style.transform = 'translateY(-50%) scale(1)';
        });
        
        this.progressBar.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                this.progressThumb.style.transform = 'translateY(-50%) scale(0)';
            }
        });
        
        // 新增：键盘快捷键
        this.bindKeyboardShortcuts();
    }
    
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 忽略在输入框中的按键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey) {
                        this.audio.currentTime -= 10;
                    } else {
                        this.audio.currentTime -= 5;
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) {
                        this.audio.currentTime += 10;
                    } else {
                        this.audio.currentTime += 5;
                    }
                    break;
                case 'ArrowUp':
                    this.volumeSlider.value = Math.min(100, parseInt(this.volumeSlider.value) + 10);
                    this.updateVolume();
                    break;
                case 'ArrowDown':
                    this.volumeSlider.value = Math.max(0, parseInt(this.volumeSlider.value) - 10);
                    this.updateVolume();
                    break;
                case 'KeyM':
                    this.toggleMute();
                    break;
                case 'KeyF':
                    this.audio.currentTime = 0;
                    break;
                case 'KeyL':
                    if (this.lyrics.length > 0) {
                        this.scrollToCurrentLyric();
                    }
                    break;
            }
        });
    }
    
    // 进度条拖拽功能
    isDragging = false;
    
    startDragging(e) {
        this.isDragging = true;
        this.seek(e);
        this.progressThumb.style.transform = 'translateY(-50%) scale(1.1)';
    }
    
    drag(e) {
        if (!this.isDragging) return;
        this.seek(e);
    }
    
    stopDragging() {
        this.isDragging = false;
        this.progressThumb.style.transform = 'translateY(-50%) scale(1)';
    }
    
    handleLyricsScroll() {
        this.isUserScrolling = true;
        
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        this.scrollTimeout = setTimeout(() => {
            this.isUserScrolling = false;
        }, 3000);
    }
    
    loadTrack(index) {
        const track = this.playlist[index];
        if (!track) return;
        
        this.currentTrackIndex = index;
        
        // 显示加载状态
        this.showLoadingState();
        
        // 加载音频
        this.audio.src = track.mp3;
        
        // 更新歌曲信息
        document.getElementById('title').textContent = track.title;
        document.getElementById('artist').textContent = track.artist;
        document.getElementById('album').textContent = track.album;
        
        // 加载歌词
        this.loadLyricsFromURL(track.lrc);
        
        // 更新文件显示
        this.musicFileName.textContent = track.mp3.split('/').pop();
        this.lyricsFileName.textContent = track.lrc.split('/').pop();
        
        // 重置滚动状态
        this.isUserScrolling = false;
        
        // 自动播放
        this.audio.play().catch(e => {
            console.log('自动播放被阻止，需要用户交互');
        });
        
        // 隐藏加载状态
        setTimeout(() => this.hideLoadingState(), 500);
    }
    
    showLoadingState() {
        this.playBtn.classList.add('loading');
        this.progress.style.width = '0%';
        this.progressThumb.style.left = '0%';
    }
    
    hideLoadingState() {
        this.playBtn.classList.remove('loading');
    }
    
    async loadLyricsFromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const lrcText = await response.text();
            const lyrics = this.parseLRC(lrcText);
            this.displayLyrics(lyrics);
        } catch (error) {
            console.error('加载歌词失败:', error);
            this.displayErrorLyrics();
        }
    }
    
    displayErrorLyrics() {
        this.lyricsDisplay.innerHTML = `
            <div class="no-lyrics">
                <i class="fas fa-exclamation-triangle"></i>
                <p>歌词加载失败</p>
                <p>请检查 White_Night.lrc 文件是否存在</p>
            </div>
        `;
        this.lyrics = [];
    }
    
    loadDefaultTrack() {
        this.loadTrack(0);
    }
    
    togglePlay() {
        if (this.audio.paused) {
            this.audio.play().then(() => {
                this.initVisualizer();
            }).catch(e => {
                console.error('播放失败:', e);
                this.showToast('播放失败，请点击播放按钮');
            });
        } else {
            this.audio.pause();
            this.stopVisualizer();
        }
    }
    
    showToast(message) {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--dark-color);
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            z-index: 1000;
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(toast);
        
        // 显示toast
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
            toast.style.opacity = '1';
        });
        
        // 3秒后隐藏toast
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    updatePlayButton(playing) {
        if (playing) {
            this.playIcon.classList.remove('fa-play');
            this.playIcon.classList.add('fa-pause');
            this.playBtn.setAttribute('title', '暂停');
            this.playBtn.classList.add('pulse');
        } else {
            this.playIcon.classList.remove('fa-pause');
            this.playIcon.classList.add('fa-play');
            this.playBtn.setAttribute('title', '播放');
            this.playBtn.classList.remove('pulse');
        }
    }
    
    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.audio.currentTime = percent * this.audio.duration;
        
        // 立即更新进度条
        this.progress.style.width = `${percent * 100}%`;
        this.progressThumb.style.left = `${percent * 100}%`;
        this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
    }
    
    animateProgress() {
        const animate = () => {
            if (!this.audio.paused && !this.isDragging) {
                const currentTime = this.audio.currentTime;
                const duration = this.audio.duration;
                
                if (duration && !isNaN(duration)) {
                    const percent = (currentTime / duration) * 100;
                    this.progress.style.width = `${percent}%`;
                    this.progressThumb.style.left = `${percent}%`;
                    this.currentTimeEl.textContent = this.formatTime(currentTime);
                }
            }
            this.progressAnimationId = requestAnimationFrame(animate);
        };
        this.progressAnimationId = requestAnimationFrame(animate);
    }
    
    stopProgressAnimation() {
        if (this.progressAnimationId) {
            cancelAnimationFrame(this.progressAnimationId);
            this.progressAnimationId = null;
        }
    }
    
    updateProgress() {
        if (this.isDragging) return;
        
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (duration && !isNaN(duration)) {
            const percent = (currentTime / duration) * 100;
            this.progress.style.width = `${percent}%`;
            this.progressThumb.style.left = `${percent}%`;
        }
    }
    
    updateDuration() {
        const duration = this.audio.duration;
        if (duration && !isNaN(duration)) {
            this.durationEl.textContent = this.formatTime(duration);
        }
    }
    
    updateVolume() {
        const volume = this.volumeSlider.value / 100;
        this.audio.volume = volume;
        
        // 更新音量图标
        if (volume === 0) {
            this.volumeIcon.classList.remove('fa-volume-up', 'fa-volume-down');
            this.volumeIcon.classList.add('fa-volume-mute');
        } else if (volume < 0.5) {
            this.volumeIcon.classList.remove('fa-volume-up', 'fa-volume-mute');
            this.volumeIcon.classList.add('fa-volume-down');
        } else {
            this.volumeIcon.classList.remove('fa-volume-down', 'fa-volume-mute');
            this.volumeIcon.classList.add('fa-volume-up');
        }
        
        // 保存音量设置
        localStorage.setItem('music-player-volume', volume);
    }
    
    toggleMute() {
        this.audio.muted = !this.audio.muted;
        
        if (this.audio.muted) {
            this.volumeIcon.classList.remove('fa-volume-up', 'fa-volume-down');
            this.volumeIcon.classList.add('fa-volume-mute');
        } else {
            this.updateVolume();
        }
    }
    
    updateSpeed() {
        const speed = parseFloat(this.speedSelect.value);
        this.audio.playbackRate = speed;
        localStorage.setItem('music-player-speed', speed);
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    // 歌词处理
    parseLRC(lrcText) {
        const lines = lrcText.split('\n');
        const lyrics = [];
        
        lines.forEach(line => {
            const timeMatches = line.match(/\[(\d{2}):(\d{2})(?:[\.:](\d{2,3}))?\]/g);
            
            if (timeMatches && timeMatches.length > 0) {
                const text = line.replace(/\[.*?\]/g, '').trim();
                
                if (text) {
                    timeMatches.forEach(timeMatch => {
                        const match = timeMatch.match(/\[(\d{2}):(\d{2})(?:[\.:](\d{2,3}))?\]/);
                        if (match) {
                            const minutes = parseInt(match[1]);
                            const seconds = parseInt(match[2]);
                            const milliseconds = match[3] ? 
                                parseInt(match[3]) / (match[3].length === 2 ? 100 : 1000) : 0;
                            const time = minutes * 60 + seconds + milliseconds;
                            
                            lyrics.push({
                                time: time,
                                text: text
                            });
                        }
                    });
                }
            }
        });
        
        lyrics.sort((a, b) => a.time - b.time);
        return lyrics;
    }
    
    displayLyrics(lyrics) {
        this.lyrics = lyrics;
        this.lyricsDisplay.innerHTML = '';
        this.lyricElements = [];
        
        if (lyrics.length === 0) {
            this.lyricsDisplay.innerHTML = `
                <div class="no-lyrics">
                    <i class="fas fa-music"></i>
                    <p>暂无歌词</p>
                </div>
            `;
            return;
        }
        
        lyrics.forEach((lyric, index) => {
            const lyricElement = document.createElement('div');
            lyricElement.className = 'lyric-line';
            lyricElement.dataset.index = index;
            lyricElement.style.setProperty('--line-index', index);
            lyricElement.textContent = lyric.text;
            this.lyricsDisplay.appendChild(lyricElement);
            this.lyricElements.push(lyricElement);
            
            // 添加点击事件
            lyricElement.addEventListener('click', () => {
                this.audio.currentTime = lyric.time;
                this.audio.play().catch(console.error);
            });
        });
        
        this.currentLyricIndex = 0;
        this.isUserScrolling = false;
    }
    
    highlightLyrics() {
        if (this.lyrics.length === 0 || this.lyricElements.length === 0) return;
        
        const currentTime = this.audio.currentTime;
        
        // 二分查找当前歌词
        let low = 0, high = this.lyrics.length - 1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.lyrics[mid].time <= currentTime) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        
        const newIndex = Math.max(0, high);
        
        // 如果歌词索引变化，更新高亮
        if (newIndex !== this.currentLyricIndex && this.lyricElements[newIndex]) {
            // 移除旧的高亮
            if (this.lyricElements[this.currentLyricIndex]) {
                this.lyricElements[this.currentLyricIndex].classList.remove('active');
            }
            
            // 添加新的高亮
            this.lyricElements[newIndex].classList.add('active');
            
            // 只有在用户没有手动滚动时才自动滚动
            if (!this.isUserScrolling) {
                this.smoothScrollToLyric(this.lyricElements[newIndex]);
            }
            
            this.currentLyricIndex = newIndex;
        }
    }
    
    smoothScrollToLyric(element) {
        if (!element || !this.lyricsDisplay) return;
        
        const lyricsContainer = this.lyricsDisplay;
        const elementTop = element.offsetTop;
        const elementHeight = element.offsetHeight;
        const containerHeight = lyricsContainer.clientHeight;
        
        // 计算目标滚动位置
        const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        // 如果已经在可视区域内，不滚动
        const currentScrollTop = lyricsContainer.scrollTop;
        if (Math.abs(targetScrollTop - currentScrollTop) < containerHeight / 3) {
            return;
        }
        
        // 使用requestAnimationFrame实现平滑滚动
        const startScrollTop = currentScrollTop;
        const distance = targetScrollTop - startScrollTop;
        const duration = 800;
        let startTime = null;
        
        const animateScroll = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用缓动函数
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            lyricsContainer.scrollTop = startScrollTop + (distance * easeOutCubic);
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };
        
        requestAnimationFrame(animateScroll);
    }
    
    scrollToCurrentLyric() {
        if (this.lyricElements[this.currentLyricIndex]) {
            this.smoothScrollToLyric(this.lyricElements[this.currentLyricIndex]);
            this.isUserScrolling = false;
        }
    }
    
    // 音频可视化
    initVisualizer() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.source = this.audioContext.createMediaElementSource(this.audio);
            
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.analyser.fftSize = 256;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.initVisualizerBars();
        }
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.drawVisualizer();
    }
    
    stopVisualizer() {
        if (this.visualizerAnimation) {
            cancelAnimationFrame(this.visualizerAnimation);
            this.visualizerAnimation = null;
        }
    }
    
    drawVisualizer() {
        if (!this.analyser) return;
        
        this.visualizerAnimation = requestAnimationFrame(() => this.drawVisualizer());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const barCount = this.visualizerBars.length;
        const barWidth = width / barCount;
        
        this.canvasCtx.clearRect(0, 0, width, height);
        
        // 绘制背景渐变
        const bgGradient = this.canvasCtx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, 'rgba(108, 92, 231, 0.05)');
        bgGradient.addColorStop(1, 'rgba(253, 121, 168, 0.02)');
        this.canvasCtx.fillStyle = bgGradient;
        this.canvasCtx.fillRect(0, 0, width, height);
        
        // 更新并绘制频谱柱状图
        for (let i = 0; i < barCount; i++) {
            const barIndex = Math.floor((i / barCount) * this.dataArray.length);
            const amplitude = this.dataArray[barIndex];
            const targetHeight = (amplitude / 255) * height * 0.9;
            
            // 平滑过渡
            const bar = this.visualizerBars[i];
            bar.targetHeight = targetHeight;
            bar.height += (bar.targetHeight - bar.height) * bar.speed;
            
            const barHeight = bar.height;
            
            // 创建渐变
            const gradient = this.canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
            const hue = 260 + (i / barCount) * 60;
            gradient.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
            gradient.addColorStop(0.7, `hsl(${hue + 20}, 80%, 70%)`);
            gradient.addColorStop(1, `hsl(${hue + 40}, 90%, 80%)`);
            
            this.canvasCtx.fillStyle = gradient;
            
            // 绘制柱状
            const x = i * barWidth + barWidth * 0.1;
            const y = height - barHeight;
            const actualBarWidth = barWidth * 0.8;
            
            // 圆角矩形
            const radius = actualBarWidth / 2;
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(x + radius, y);
            this.canvasCtx.lineTo(x + actualBarWidth - radius, y);
            this.canvasCtx.quadraticCurveTo(x + actualBarWidth, y, x + actualBarWidth, y + radius);
            this.canvasCtx.lineTo(x + actualBarWidth, height - radius);
            this.canvasCtx.quadraticCurveTo(x + actualBarWidth, height, x + actualBarWidth - radius, height);
            this.canvasCtx.lineTo(x + radius, height);
            this.canvasCtx.quadraticCurveTo(x, height, x, height - radius);
            this.canvasCtx.lineTo(x, y + radius);
            this.canvasCtx.quadraticCurveTo(x, y, x + radius, y);
            this.canvasCtx.closePath();
            this.canvasCtx.fill();
            
            // 添加高光
            const highlightGradient = this.canvasCtx.createLinearGradient(0, y, 0, y + 20);
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            highlightGradient.addColorStop(1, 'transparent');
            this.canvasCtx.fillStyle = highlightGradient;
            this.canvasCtx.fill();
        }
        
        // 绘制波形线
        this.canvasCtx.beginPath();
        this.canvasCtx.lineWidth = 2;
        const lineGradient = this.canvasCtx.createLinearGradient(0, 0, width, 0);
        lineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        lineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
        lineGradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
        this.canvasCtx.strokeStyle = lineGradient;
        
        const sliceWidth = width / this.dataArray.length;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const v = this.dataArray[i] / 255;
            const y = (v * height) / 2 + height / 4;
            
            if (i === 0) {
                this.canvasCtx.moveTo(x, y);
            } else {
                this.canvasCtx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.canvasCtx.stroke();
        
        // 绘制粒子效果
        for (let i = 0; i < 20; i++) {
            const barIndex = Math.floor(Math.random() * barCount);
            const amplitude = this.dataArray[barIndex] / 255;
            if (amplitude > 0.7) {
                const x = (barIndex / barCount) * width + (Math.random() * barWidth);
                const y = height - (amplitude * height) + Math.random() * 20;
                const radius = 1 + Math.random() * 2;
                
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(x, y, radius, 0, Math.PI * 2);
                this.canvasCtx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`;
                this.canvasCtx.fill();
            }
        }
    }
    
    // 文件上传处理
    loadMusicFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.musicFileName.textContent = file.name;
        
        const url = URL.createObjectURL(file);
        this.audio.src = url;
        
        // 更新歌曲信息
        document.getElementById('title').textContent = file.name.replace(/\.[^/.]+$/, "");
        document.getElementById('artist').textContent = '上传文件';
        document.getElementById('album').textContent = '';
        
        // 重置歌词
        this.lyrics = [];
        this.lyricsDisplay.innerHTML = '<div class="no-lyrics">请上传对应的歌词文件</div>';
        this.isUserScrolling = false;
        
        // 播放新文件
        this.audio.play().catch(e => {
            console.log('需要用户交互才能播放');
        });
    }
    
    loadLyricsFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.lyricsFileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const lyrics = this.parseLRC(e.target.result);
            this.displayLyrics(lyrics);
            this.isUserScrolling = false;
        };
        reader.onerror = (e) => {
            console.error('读取歌词文件失败:', e);
            this.lyricsDisplay.innerHTML = '<div class="no-lyrics">读取歌词文件失败</div>';
        };
        reader.readAsText(file, 'UTF-8');
    }
    
    prevTrack() {
        let newIndex = this.currentTrackIndex - 1;
        if (newIndex < 0) newIndex = this.playlist.length - 1;
        this.loadTrack(newIndex);
    }
    
    nextTrack() {
        let newIndex = this.currentTrackIndex + 1;
        if (newIndex >= this.playlist.length) newIndex = 0;
        this.loadTrack(newIndex);
    }
    
    // 添加加载保存的设置
    loadSavedSettings() {
        const savedVolume = localStorage.getItem('music-player-volume');
        if (savedVolume) {
            this.volumeSlider.value = savedVolume * 100;
            this.updateVolume();
        }
        
        const savedSpeed = localStorage.getItem('music-player-speed');
        if (savedSpeed) {
            this.speedSelect.value = savedSpeed;
            this.updateSpeed();
        }
    }
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    
    // 添加页面加载动画
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // 添加波纹效果
    document.addEventListener('click', function(e) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: rgba(108, 92, 231, 0.3);
            border-radius: 50%;
            pointer-events: none;
            transform: translate(-50%, -50%);
            animation: ripple 0.6s linear;
            z-index: 9999;
        `;
        
        document.body.appendChild(ripple);
        
        const x = e.clientX;
        const y = e.clientY;
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple {
                0% {
                    width: 20px;
                    height: 20px;
                    opacity: 0.3;
                }
                100% {
                    width: 200px;
                    height: 200px;
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
            ripple.remove();
            style.remove();
        }, 600);
    });
});
