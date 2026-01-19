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
        
        // 初始化
        this.init();
    }
    
    init() {
        // 设置画布尺寸
        this.setCanvasSize();
        window.addEventListener('resize', () => this.setCanvasSize());
        
        // 绑定事件
        this.bindEvents();
        
        // 加载示例
        this.loadSample();
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
        this.loadSampleBtn.addEventListener('click', () => this.loadSample());
        
        // 切歌按钮（示例功能）
        this.prevBtn.addEventListener('click', () => this.prevSong());
        this.nextBtn.addEventListener('click', () => this.nextSong());
    }
    
    togglePlay() {
        if (this.audio.paused) {
            this.audio.play();
            this.initVisualizer();
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
        
        if (duration) {
            const percent = (currentTime / duration) * 100;
            this.progress.style.width = `${percent}%`;
            this.progressThumb.style.left = `${percent}%`;
            
            this.currentTimeEl.textContent = this.formatTime(currentTime);
        }
    }
    
    updateDuration() {
        const duration = this.audio.duration;
        if (duration) {
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
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    // 歌词处理
    parseLRC(lrcText) {
        const lines = lrcText.split('\n');
        const lyrics = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})?\]/g;
        
        lines.forEach(line => {
            const matches = [...line.matchAll(timeRegex)];
            const text = line.replace(timeRegex, '').trim();
            
            if (text && matches.length > 0) {
                matches.forEach(match => {
                    const minutes = parseInt(match[1]);
                    const seconds = parseInt(match[2]);
                    const milliseconds = match[3] ? parseInt(match[3]) / (match[3].length === 2 ? 100 : 1000) : 0;
                    const time = minutes * 60 + seconds + milliseconds;
                    
                    lyrics.push({
                        time: time,
                        text: text
                    });
                });
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
    }
    
    highlightLyrics() {
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
            const gradient = this.canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, varGetComputedStyle('--primary-color'));
            gradient.addColorStop(1, varGetComputedStyle('--accent-color'));
            
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
    
    // 文件处理
    loadMusicFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.musicFileName.textContent = file.name;
        
        const url = URL.createObjectURL(file);
        this.audio.src = url;
        
        // 更新歌曲信息
        document.getElementById('title').textContent = file.name.replace('.mp3', '');
        
        // 自动加载同名歌词文件
        const lyricsFileName = file.name.replace('.mp3', '.lrc');
        this.tryLoadLyricsFile(lyricsFileName);
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
        reader.readAsText(file);
    }
    
    tryLoadLyricsFile(filename) {
        // 在真实项目中，这里应该从服务器请求歌词文件
        // 此处仅作为示例，实际需要用户上传
        console.log(`尝试加载歌词文件: ${filename}`);
    }
    
    loadSample() {
        // 使用示例音频（在实际部署中，需要将示例文件放在uploads文件夹）
        // 这里使用一个在线示例音频
        this.audio.src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        
        // 加载示例歌词
        const sampleLyrics = `[00:00.00] 网页音乐播放器示例
[00:05.00] 请上传您的音乐和歌词文件
[00:15.00] 或者点击"加载示例"按钮
[00:25.00] 体验完整的播放器功能
[00:35.00] 支持歌词高亮和音频可视化
[00:45.00] 进度条、音量、播放速度控制
[01:00.00] 欢迎使用网页音乐播放器
[01:10.00] 享受音乐带来的美好时光
[01:20.00] 部署到Vercel完全静态网站
[01:30.00] 感谢使用本播放器
[01:40.00] 祝你有个愉快的音乐体验`;
        
        const lyrics = this.parseLRC(sampleLyrics);
        this.displayLyrics(lyrics);
        
        // 更新文件显示
        this.musicFileName.textContent = '示例音乐.mp3';
        this.lyricsFileName.textContent = '示例歌词.lrc';
        
        // 更新歌曲信息
        document.getElementById('title').textContent = '示例音乐';
        document.getElementById('artist').textContent = '网页播放器';
        document.getElementById('album').textContent = '演示专辑';
    }
    
    prevSong() {
        alert('上一曲功能需要更多歌曲资源，请上传您的音乐文件。');
    }
    
    nextSong() {
        alert('下一曲功能需要更多歌曲资源，请上传您的音乐文件。');
    }
}

// 辅助函数：获取CSS变量值
function varGetComputedStyle(variable) {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
});
