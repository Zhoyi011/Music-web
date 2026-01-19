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
        
        // 播放列表
        this.playlist = [
            {
                title: 'White Night',
                artist: '白夜',
                mp3: 'uploads/White_Night.mp3',
                lrc: 'uploads/White_Night.lrc'
            }
        ];
        this.currentTrackIndex = 0;
        
        // 初始化
        this.init();
    }
    
    init() {
        // 设置画布尺寸
        this.setCanvasSize();
        window.addEventListener('resize', () => this.setCanvasSize());
        
        // 绑定事件
        this.bindEvents();
        
        // 自动加载第一首歌
        this.loadTrack(0);
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
        
        // 歌词高亮
        this.audio.addEventListener('timeupdate', () => this.highlightLyrics());
        
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
    }
    
    loadTrack(index) {
        const track = this.playlist[index];
        if (!track) return;
        
        this.currentTrackIndex = index;
        
        // 加载音频
        this.audio.src = track.mp3;
        
        // 更新歌曲信息
        document.getElementById('title').textContent = track.title;
        document.getElementById('artist').textContent = track.artist;
        document.getElementById('album').textContent = '';
        
        // 加载歌词
        this.loadLyricsFromURL(track.lrc);
        
        // 更新文件显示
        this.musicFileName.textContent = track.mp3.split('/').pop();
        this.lyricsFileName.textContent = track.lrc.split('/').pop();
        
        // 如果正在播放，继续播放新歌曲
        if (!this.audio.paused) {
            this.audio.play().catch(e => console.log('播放失败:', e));
        }
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
                <p>歌词加载失败</p>
                <p>请检查 White_Night.lrc 文件是否存在</p>
                <p>或通过"选择歌词文件"按钮上传</p>
            </div>
        `;
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
                alert('播放失败，请检查音频文件或点击"加载示例"按钮');
            });
        } else {
            this.audio.pause();
            this.stopVisualizer();
        }
    }
    
    updatePlayButton(playing) {
        if (playing) {
            this.playIcon.classList.remove('fa-play');
            this.playIcon.classList.add('fa-pause');
            this.playBtn.setAttribute('title', '暂停');
        } else {
            this.playIcon.classList.remove('fa-pause');
            this.playIcon.classList.add('fa-play');
            this.playBtn.setAttribute('title', '播放');
        }
    }
    
    seek(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = percent * this.audio.duration;
        this.progress.style.width = `${percent * 100}%`;
        this.progressThumb.style.left = `${percent * 100}%`;
    }
    
    updateProgress() {
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (duration && !isNaN(duration)) {
            const percent = (currentTime / duration) * 100;
            this.progress.style.width = `${percent}%`;
            this.progressThumb.style.left = `${percent}%`;
            
            this.currentTimeEl.textContent = this.formatTime(currentTime);
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
            // 匹配时间标签，支持 [mm:ss.xx] 或 [mm:ss:xx] 格式
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
        
        // 按时间排序
        lyrics.sort((a, b) => a.time - b.time);
        return lyrics;
    }
    
    displayLyrics(lyrics) {
        this.lyrics = lyrics;
        this.lyricsDisplay.innerHTML = '';
        
        if (lyrics.length === 0) {
            this.lyricsDisplay.innerHTML = '<div class="no-lyrics">歌词为空或格式不正确</div>';
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
    }
    
    highlightLyrics() {
        if (this.lyrics.length === 0) return;
        
        const currentTime = this.audio.currentTime;
        
        // 找到当前应该高亮的歌词
        let newIndex = 0;
        for (let i = this.lyrics.length - 1; i >= 0; i--) {
            if (currentTime >= this.lyrics[i].time) {
                newIndex = i;
                break;
            }
        }
        
        // 如果歌词索引变化，更新高亮
        if (newIndex !== this.currentLyricIndex) {
            // 移除旧的高亮
            const oldActive = this.lyricsDisplay.querySelector('.lyric-line.active');
            if (oldActive) {
                oldActive.classList.remove('active');
            }
            
            // 添加新的高亮
            const newActive = this.lyricsDisplay.querySelector(`.lyric-line[data-index="${newIndex}"]`);
            if (newActive) {
                newActive.classList.add('active');
                
                // 滚动到可视区域
                newActive.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
            
            this.currentLyricIndex = newIndex;
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
        const barCount = 64;
        const barWidth = width / barCount;
        
        this.canvasCtx.clearRect(0, 0, width, height);
        
        // 绘制频谱柱状图
        for (let i = 0; i < barCount; i++) {
            const barIndex = Math.floor((i / barCount) * this.dataArray.length);
            const amplitude = this.dataArray[barIndex];
            const barHeight = (amplitude / 255) * height * 0.8;
            
            // 创建渐变
            const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#6c5ce7';
            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#fd79a8';
            
            const gradient = this.canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, primaryColor);
            gradient.addColorStop(1, accentColor);
            
            this.canvasCtx.fillStyle = gradient;
            
            // 绘制柱状
            const x = i * barWidth;
            const y = height - barHeight;
            
            // 圆角矩形
            const radius = barWidth / 4;
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(x + radius, y);
            this.canvasCtx.lineTo(x + barWidth - radius, y);
            this.canvasCtx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
            this.canvasCtx.lineTo(x + barWidth, height - radius);
            this.canvasCtx.quadraticCurveTo(x + barWidth, height, x + barWidth - radius, height);
            this.canvasCtx.lineTo(x + radius, height);
            this.canvasCtx.quadraticCurveTo(x, height, x, height - radius);
            this.canvasCtx.lineTo(x, y + radius);
            this.canvasCtx.quadraticCurveTo(x, y, x + radius, y);
            this.canvasCtx.closePath();
            this.canvasCtx.fill();
        }
        
        // 绘制波形线
        this.canvasCtx.beginPath();
        this.canvasCtx.lineWidth = 2;
        this.canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        
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
        
        // 尝试自动查找同名歌词文件
        const lyricsFileName = file.name.replace(/\.[^/.]+$/, ".lrc");
        console.log(`尝试加载歌词文件: ${lyricsFileName}`);
    }
    
    loadLyricsFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.lyricsFileName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const lyrics = this.parseLRC(e.target.result);
            this.displayLyrics(lyrics);
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
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
    
    // 添加键盘快捷键支持
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                player.togglePlay();
                break;
            case 'ArrowLeft':
                if (e.ctrlKey) {
                    player.audio.currentTime -= 10;
                } else {
                    player.audio.currentTime -= 5;
                }
                break;
            case 'ArrowRight':
                if (e.ctrlKey) {
                    player.audio.currentTime += 10;
                } else {
                    player.audio.currentTime += 5;
                }
                break;
            case 'ArrowUp':
                player.volumeSlider.value = Math.min(100, parseInt(player.volumeSlider.value) + 10);
                player.updateVolume();
                break;
            case 'ArrowDown':
                player.volumeSlider.value = Math.max(0, parseInt(player.volumeSlider.value) - 10);
                player.updateVolume();
                break;
        }
    });
});
