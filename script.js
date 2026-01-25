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
        this.previousLyricIndex = -1;
        this.isUserScrolling = false;
        this.scrollTimeout = null;
        
        // 可视化相关
        this.canvas = document.getElementById('visualizer');
        this.canvasCtx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.animationId = null;
        
        // 文件选择
        this.musicFileInput = document.getElementById('music-file');
        this.lyricsFileInput = document.getElementById('lyrics-file');
        this.musicFileName = document.getElementById('music-file-name');
        this.lyricsFileName = document.getElementById('lyrics-file-name');
        this.loadSampleBtn = document.getElementById('load-sample');
        
        // 播放列表相关
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.playlistElement = null;
        
        // 性能优化
        this.lastUpdateTime = 0;
        this.updateInterval = 16;
        
        // 初始化
        this.init();
    }
    
    async init() {
        // 设置画布尺寸
        this.setCanvasSize();
        const resizeObserver = new ResizeObserver(() => {
            this.setCanvasSize();
        });
        resizeObserver.observe(this.canvas);
        
        // 创建播放列表元素
        this.createPlaylistElement();
        
        // 绑定事件
        this.bindEvents();
        
        // 扫描并加载播放列表
        await this.scanAndLoadPlaylist();
        
        // 如果有歌曲，自动加载第一首
        if (this.playlist.length > 0) {
            this.loadTrack(0);
        }
    }
    
    createPlaylistElement() {
        // 创建播放列表容器
        const playlistContainer = document.createElement('div');
        playlistContainer.className = 'playlist-container';
        playlistContainer.innerHTML = `
            <h3><i class="fas fa-list"></i> 播放列表</h3>
            <div class="playlist-controls">
                <button id="refresh-playlist" class="file-btn" title="刷新列表">
                    <i class="fas fa-sync-alt"></i> 刷新列表
                </button>
                <div class="playlist-info">
                    <span id="playlist-count">0 首歌曲</span>
                </div>
            </div>
            <div class="playlist-display">
                <div class="playlist-items" id="playlist-items"></div>
            </div>
        `;
        
        // 插入到歌词容器后面
        const lyricsContainer = document.querySelector('.lyrics-container');
        lyricsContainer.parentNode.insertBefore(playlistContainer, lyricsContainer.nextSibling);
        
        // 获取播放列表元素
        this.playlistElement = document.getElementById('playlist-items');
        
        // 绑定刷新按钮事件
        document.getElementById('refresh-playlist').addEventListener('click', () => {
            this.scanAndLoadPlaylist();
        });
    }
    
    async scanAndLoadPlaylist() {
        try {
            // 模拟扫描uploads文件夹
            // 在实际部署中，这里需要服务器支持列出文件
            // 这里我们使用一个预设的歌曲列表，并模拟动态添加
            this.playlist = [];
            
            // 尝试从服务器获取文件列表（需要服务器支持）
            try {
                const response = await fetch('uploads/');
                if (response.ok) {
                    const html = await response.text();
                    // 解析HTML获取文件列表
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const links = doc.querySelectorAll('a');
                    
                    links.forEach(link => {
                        const fileName = link.getAttribute('href');
                        if (fileName && fileName.endsWith('.mp3')) {
                            this.addToPlaylist(fileName);
                        }
                    });
                }
            } catch (error) {
                console.log('无法自动扫描文件夹，使用默认方法...');
                // 使用默认方法：尝试加载已知文件
                this.addToPlaylist('White_Night.mp3');
            }
            
            // 更新播放列表显示
            this.updatePlaylistDisplay();
            
        } catch (error) {
            console.error('扫描播放列表失败:', error);
            this.showToast('无法扫描歌曲列表，请手动上传文件');
        }
    }
    
    addToPlaylist(mp3FileName) {
        // 从文件名提取歌曲名称（去除.mp3扩展名）
        const songName = mp3FileName.replace('.mp3', '').replace(/_/g, ' ');
        const lrcFileName = mp3FileName.replace('.mp3', '.lrc');
        
        this.playlist.push({
            title: songName,
            artist: '未知艺术家',
            mp3: `uploads/${mp3FileName}`,
            lrc: `uploads/${lrcFileName}`,
            fileName: mp3FileName
        });
    }
    
    updatePlaylistDisplay() {
        if (!this.playlistElement) return;
        
        this.playlistElement.innerHTML = '';
        
        if (this.playlist.length === 0) {
            this.playlistElement.innerHTML = `
                <div class="no-songs">
                    <i class="fas fa-music"></i>
                    <p>暂无歌曲</p>
                    <p>请将MP3文件放入uploads文件夹</p>
                </div>
            `;
            document.getElementById('playlist-count').textContent = '0 首歌曲';
            return;
        }
        
        this.playlist.forEach((track, index) => {
            const songElement = document.createElement('div');
            songElement.className = `playlist-item ${index === this.currentTrackIndex ? 'active' : ''}`;
            songElement.dataset.index = index;
            
            songElement.innerHTML = `
                <div class="song-info">
                    <div class="song-number">${index + 1}</div>
                    <div class="song-details">
                        <div class="song-title">${track.title}</div>
                        <div class="song-artist">${track.artist}</div>
                    </div>
                </div>
                <div class="song-controls">
                    <button class="play-song-btn" title="播放">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `;
            
            // 点击播放按钮
            songElement.querySelector('.play-song-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadTrack(index);
                this.audio.play();
            });
            
            // 点击整行播放
            songElement.addEventListener('click', () => {
                this.loadTrack(index);
                this.audio.play();
            });
            
            this.playlistElement.appendChild(songElement);
        });
        
        document.getElementById('playlist-count').textContent = `${this.playlist.length} 首歌曲`;
    }
    
    setCanvasSize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    
    bindEvents() {
        // 播放/暂停
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.audio.addEventListener('play', () => this.updatePlayButton(true));
        this.audio.addEventListener('pause', () => this.updatePlayButton(false));
        
        // 进度条控制
        this.progressBar.addEventListener('click', (e) => this.seek(e));
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        
        // 音量控制
        this.volumeSlider.addEventListener('input', () => this.updateVolume());
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        
        // 播放速度
        this.speedSelect.addEventListener('change', () => this.updateSpeed());
        
        // 文件上传
        this.musicFileInput.addEventListener('change', (e) => this.loadMusicFile(e));
        this.lyricsFileInput.addEventListener('change', (e) => this.loadLyricsFile(e));
        this.loadSampleBtn.addEventListener('click', () => this.loadDefaultTrack());
        
        // 切歌按钮
        this.prevBtn.addEventListener('click', () => this.prevTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        
        // 监听歌词区域滚动事件
        this.lyricsDisplay.addEventListener('scroll', () => {
            this.handleLyricsScroll();
        });
        
        // 点击歌词跳转到对应时间
        this.lyricsDisplay.addEventListener('click', (e) => {
            const lyricLine = e.target.closest('.lyric-line');
            if (lyricLine) {
                const index = parseInt(lyricLine.dataset.index);
                if (!isNaN(index) && this.lyrics[index]) {
                    this.audio.currentTime = this.lyrics[index].time;
                    if (this.audio.paused) {
                        this.audio.play();
                    }
                }
            }
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.audio.currentTime -= e.ctrlKey ? 10 : 5;
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.audio.currentTime += e.ctrlKey ? 10 : 5;
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.volumeSlider.value = Math.min(100, parseInt(this.volumeSlider.value) + 10);
                    this.updateVolume();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.volumeSlider.value = Math.max(0, parseInt(this.volumeSlider.value) - 10);
                    this.updateVolume();
                    break;
                case 'KeyL':
                    e.preventDefault();
                    this.nextTrack();
                    break;
                case 'KeyJ':
                    e.preventDefault();
                    this.prevTrack();
                    break;
            }
        });
    }
    
    handleLyricsScroll() {
        this.isUserScrolling = true;
        
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
        
        this.scrollTimeout = setTimeout(() => {
            this.isUserScrolling = false;
        }, 2000);
    }
    
    async loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentTrackIndex = index;
        const track = this.playlist[index];
        
        // 显示加载状态
        this.showLoadingState();
        
        // 更新音频源
        this.audio.src = track.mp3;
        
        // 更新歌曲信息（使用文件名作为标题）
        document.getElementById('title').textContent = track.title;
        document.getElementById('artist').textContent = track.artist;
        document.getElementById('album').textContent = '';
        
        // 尝试加载歌词
        await this.loadLyricsFromURL(track.lrc);
        
        // 更新文件显示
        this.musicFileName.textContent = track.fileName;
        this.lyricsFileName.textContent = track.lrc.split('/').pop();
        
        // 重置状态
        this.isUserScrolling = false;
        this.currentLyricIndex = 0;
        this.previousLyricIndex = -1;
        
        // 更新播放列表高亮
        this.updatePlaylistDisplay();
        
        // 隐藏加载状态
        setTimeout(() => this.hideLoadingState(), 500);
    }
    
    async loadLyricsFromURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // 如果歌词文件不存在，显示空歌词
                this.displayEmptyLyrics();
                return;
            }
            
            const lrcText = await response.text();
            const lyrics = this.parseLRC(lrcText);
            this.displayLyrics(lyrics);
        } catch (error) {
            console.log('歌词文件不存在，显示空歌词');
            this.displayEmptyLyrics();
        }
    }
    
    displayEmptyLyrics() {
        this.lyrics = [];
        this.lyricsDisplay.innerHTML = `
            <div class="no-lyrics">
                <i class="fas fa-music"></i>
                <p>暂无歌词</p>
                <p>请上传对应的歌词文件</p>
            </div>
        `;
    }
    
    displayErrorLyrics() {
        this.lyricsDisplay.innerHTML = `
            <div class="no-lyrics">
                <i class="fas fa-exclamation-triangle"></i>
                <p>歌词加载失败</p>
            </div>
        `;
        this.lyrics = [];
    }
    
    loadDefaultTrack() {
        if (this.playlist.length > 0) {
            this.loadTrack(0);
        }
    }
    
    showLoadingState() {
        this.playBtn.classList.add('loading');
        this.progress.style.width = '0%';
        this.progressThumb.style.left = '0%';
    }
    
    hideLoadingState() {
        this.playBtn.classList.remove('loading');
    }
    
    togglePlay() {
        if (this.audio.paused) {
            if (!this.audio.src) {
                if (this.playlist.length > 0) {
                    this.loadTrack(0);
                }
                return;
            }
            
            this.audio.play().then(() => {
                this.initVisualizer();
                this.startLyricsUpdate();
            }).catch(e => {
                console.error('播放失败:', e);
            });
        } else {
            this.audio.pause();
            this.stopVisualizer();
            this.stopLyricsUpdate();
        }
    }
    
    updatePlayButton(playing) {
        this.playIcon.className = playing ? 'fas fa-pause' : 'fas fa-play';
        this.playBtn.title = playing ? '暂停' : '播放';
    }
    
    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.audio.currentTime = percent * this.audio.duration;
        this.updateProgressDisplay(percent);
    }
    
    updateProgress() {
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (duration && !isNaN(duration)) {
            const percent = (currentTime / duration) * 100;
            this.updateProgressDisplay(percent / 100);
            this.currentTimeEl.textContent = this.formatTime(currentTime);
            
            // 更新歌词高亮
            this.updateLyricsHighlight(currentTime);
        }
    }
    
    updateProgressDisplay(percent) {
        const now = Date.now();
        if (now - this.lastUpdateTime > this.updateInterval) {
            this.progress.style.width = `${percent * 100}%`;
            this.progressThumb.style.left = `${percent * 100}%`;
            this.lastUpdateTime = now;
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
            this.volumeIcon.className = 'fas fa-volume-mute';
        } else if (volume < 0.5) {
            this.volumeIcon.className = 'fas fa-volume-down';
        } else {
            this.volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    toggleMute() {
        this.audio.muted = !this.audio.muted;
        this.volumeIcon.className = this.audio.muted ? 'fas fa-volume-mute' : 
                                   this.audio.volume < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';
    }
    
    updateSpeed() {
        this.audio.playbackRate = parseFloat(this.speedSelect.value);
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
                            
                            lyrics.push({ time, text });
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
        
        if (lyrics.length === 0) {
            this.lyricsDisplay.innerHTML = '<div class="no-lyrics">暂无歌词</div>';
            return;
        }
        
        lyrics.forEach((lyric, index) => {
            const lyricElement = document.createElement('div');
            lyricElement.className = 'lyric-line';
            lyricElement.dataset.index = index;
            lyricElement.textContent = lyric.text;
            this.lyricsDisplay.appendChild(lyricElement);
        });
        
        this.currentLyricIndex = 0;
        this.previousLyricIndex = -1;
        this.isUserScrolling = false;
    }
    
    startLyricsUpdate() {
        this.updateLyricsHighlight(this.audio.currentTime);
    }
    
    stopLyricsUpdate() {
        // 清理资源
    }
    
    updateLyricsHighlight(currentTime) {
        if (this.lyrics.length === 0) return;
        
        // 二分查找当前应该高亮的歌词
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
        
        if (newIndex !== this.currentLyricIndex) {
            this.previousLyricIndex = this.currentLyricIndex;
            this.currentLyricIndex = newIndex;
            this.applyLyricsHighlight();
        }
    }
    
    applyLyricsHighlight() {
        const lyricElements = this.lyricsDisplay.querySelectorAll('.lyric-line');
        
        // 移除所有特殊类
        lyricElements.forEach(el => {
            el.classList.remove('active', 'previous', 'next');
        });
        
        // 设置当前歌词
        if (lyricElements[this.currentLyricIndex]) {
            lyricElements[this.currentLyricIndex].classList.add('active');
        }
        
        // 设置前一句歌词（如果有）
        if (this.previousLyricIndex >= 0 && lyricElements[this.previousLyricIndex]) {
            lyricElements[this.previousLyricIndex].classList.add('previous');
        }
        
        // 自动滚动到当前歌词
        if (!this.isUserScrolling && lyricElements[this.currentLyricIndex]) {
            this.smoothScrollToLyric(lyricElements[this.currentLyricIndex]);
        }
    }
    
    smoothScrollToLyric(element) {
        if (!element) return;
        
        const lyricsContainer = this.lyricsDisplay;
        const elementTop = element.offsetTop;
        const elementHeight = element.offsetHeight;
        const containerHeight = lyricsContainer.clientHeight;
        
        const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        // 如果已经在可视区域内，不滚动
        const currentScrollTop = lyricsContainer.scrollTop;
        const elementBottom = elementTop + elementHeight;
        const isVisible = (
            elementTop >= currentScrollTop &&
            elementBottom <= currentScrollTop + containerHeight
        );
        
        if (!isVisible) {
            lyricsContainer.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
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
            
            this.analyser.fftSize = 128;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
        }
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.drawVisualizer();
    }
    
    stopVisualizer() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    drawVisualizer() {
        if (!this.analyser) return;
        
        this.animationId = requestAnimationFrame(() => this.drawVisualizer());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 清除画布
        this.canvasCtx.clearRect(0, 0, width, height);
        
        // 绘制背景
        this.canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.02)';
        this.canvasCtx.fillRect(0, 0, width, height);
        
        // 绘制简化的波形
        const barWidth = width / 32;
        let x = 0;
        
        for (let i = 0; i < 32; i++) {
            const barIndex = Math.floor((i / 32) * this.dataArray.length);
            const barHeight = (this.dataArray[barIndex] / 255) * height;
            
            // 创建渐变
            const gradient = this.canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, '#6c5ce7');
            gradient.addColorStop(1, '#fd79a8');
            
            this.canvasCtx.fillStyle = gradient;
            this.canvasCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
            
            x += barWidth;
        }
    }
    
    loadMusicFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.mp3')) {
            this.showToast('请选择MP3文件');
            return;
        }
        
        this.musicFileName.textContent = file.name;
        const url = URL.createObjectURL(file);
        this.audio.src = url;
        
        // 从文件名提取歌曲名称
        const songName = file.name.replace('.mp3', '').replace(/_/g, ' ');
        
        // 更新歌曲信息
        document.getElementById('title').textContent = songName;
        document.getElementById('artist').textContent = '上传文件';
        
        // 尝试加载同名歌词文件
        const lrcFileName = file.name.replace('.mp3', '.lrc');
        this.loadLyricsFromURL(`uploads/${lrcFileName}`);
        
        // 将歌曲添加到播放列表
        this.addToPlaylist(file.name);
        this.updatePlaylistDisplay();
        
        // 播放歌曲
        this.audio.play().catch(console.error);
    }
    
    loadLyricsFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.lrc')) {
            this.showToast('请选择LRC歌词文件');
            return;
        }
        
        this.lyricsFileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const lyrics = this.parseLRC(e.target.result);
            this.displayLyrics(lyrics);
        };
        reader.onerror = (e) => {
            console.error('读取歌词文件失败:', e);
            this.showToast('读取歌词文件失败');
        };
        reader.readAsText(file, 'UTF-8');
    }
    
    prevTrack() {
        if (this.playlist.length === 0) return;
        
        let newIndex = this.currentTrackIndex - 1;
        if (newIndex < 0) newIndex = this.playlist.length - 1;
        this.loadTrack(newIndex);
        
        if (!this.audio.paused) {
            this.audio.play();
        }
    }
    
    nextTrack() {
        if (this.playlist.length === 0) return;
        
        let newIndex = this.currentTrackIndex + 1;
        if (newIndex >= this.playlist.length) newIndex = 0;
        this.loadTrack(newIndex);
        
        if (!this.audio.paused) {
            this.audio.play();
        }
    }
    
    showToast(message) {
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
        
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
            toast.style.opacity = '1';
        });
        
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    
    // 简单加载动画
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.3s ease';
        document.body.style.opacity = '1';
    });
});
