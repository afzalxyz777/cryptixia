import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const execAsync = promisify(exec);
const router = express.Router();

// Cache directory for TTS audio files
const TTS_CACHE_DIR = path.join(__dirname, '../../cache/tts');
const PIPER_PATH = path.join(__dirname, '../../piper');
const MODEL_PATH = path.join(PIPER_PATH, 'models');

// Available voice models
const VOICE_MODELS = {
    'en_US-amy-medium': 'en_US/amy/medium/en_US-amy-medium.onnx',
    'en_US-joe-medium': 'en_US/joe/medium/en_US-joe-medium.onnx',
    'en_US-ryan-high': 'en_US/ryan/high/en_US-ryan-high.onnx',
    'en_GB-alba-medium': 'en_GB/alba/medium/en_GB-alba-medium.onnx'
};

interface TTSRequest {
    text: string;
    voice?: string;
    speed?: number;
    useCache?: boolean;
}

interface VoiceInfo {
    id: string;
    name: string;
    language: string;
    quality: string;
}

// Initialize directories
async function initializeDirectories(): Promise<void> {
    try {
        await fs.mkdir(TTS_CACHE_DIR, { recursive: true });
        await fs.mkdir(PIPER_PATH, { recursive: true });
        await fs.mkdir(MODEL_PATH, { recursive: true });
    } catch (error) {
        console.error('Failed to initialize directories:', error);
    }
}

// Initialize on module load
initializeDirectories();

// Generate cache key for text
function getCacheKey(text: string, voice: string, speed: number): string {
    return crypto.createHash('md5').update(`${text}-${voice}-${speed}`).digest('hex');
}

// Sanitize text for shell execution
function sanitizeText(text: string): string {
    return text
        .replace(/[`$\\]/g, '\\$&') // Escape backticks, dollar signs, and backslashes
        .replace(/"/g, '\\"')      // Escape quotes
        .substring(0, 1000);       // Limit length
}

// Check if Piper is installed
async function checkPiperInstallation(): Promise<boolean> {
    try {
        const piperBinary = process.platform === 'win32' ? 'piper.exe' : 'piper';
        const piperPath = path.join(PIPER_PATH, piperBinary);
        await fs.access(piperPath);
        return true;
    } catch {
        return false;
    }
}

// Install Piper TTS
async function installPiper(): Promise<void> {
    console.log('🔧 Installing Piper TTS...');
    
    try {
        if (process.platform === 'win32') {
            // Windows installation
            const zipPath = path.join(PIPER_PATH, 'piper.zip');
            await execAsync(`curl -L "https://github.com/rhasspy/piper/releases/latest/download/piper_windows_amd64.zip" -o "${zipPath}"`);
            await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${PIPER_PATH}' -Force"`);
            await fs.unlink(zipPath); // Clean up zip file
        } else if (process.platform === 'linux') {
            // Linux installation
            const tarPath = path.join(PIPER_PATH, 'piper.tar.gz');
            await execAsync(`wget https://github.com/rhasspy/piper/releases/latest/download/piper_linux_x86_64.tar.gz -O "${tarPath}"`);
            await execAsync(`tar -xzf "${tarPath}" -C "${PIPER_PATH}" --strip-components=1`);
            await fs.unlink(tarPath); // Clean up tar file
            
            // Make executable
            await execAsync(`chmod +x "${path.join(PIPER_PATH, 'piper')}"`);
        } else {
            throw new Error(`Unsupported platform: ${process.platform}`);
        }

        console.log('✅ Piper TTS installed successfully');
    } catch (error) {
        console.error('❌ Failed to install Piper TTS:', error);
        throw error;
    }
}

// Download voice model
async function downloadVoiceModel(modelName: string): Promise<void> {
    const modelPath = VOICE_MODELS[modelName as keyof typeof VOICE_MODELS];
    if (!modelPath) {
        throw new Error(`Unknown voice model: ${modelName}`);
    }

    const modelFile = path.basename(modelPath);
    const modelFilePath = path.join(MODEL_PATH, modelFile);
    const configFilePath = modelFilePath + '.json';

    // Check if model already exists
    try {
        await fs.access(modelFilePath);
        await fs.access(configFilePath);
        return; // Both files exist
    } catch {
        // Files don't exist, need to download
    }

    console.log(`📥 Downloading voice model: ${modelName}`);

    try {
        const baseUrl = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';
        const modelUrl = `${baseUrl}/${modelPath}`;
        const configUrl = `${baseUrl}/${modelPath}.json`;

        // Download with timeout
        const downloadCommand = process.platform === 'win32' 
            ? `curl -L --max-time 300 "${modelUrl}" -o "${modelFilePath}" && curl -L --max-time 300 "${configUrl}" -o "${configFilePath}"`
            : `wget --timeout=300 "${modelUrl}" -O "${modelFilePath}" && wget --timeout=300 "${configUrl}" -O "${configFilePath}"`;

        await execAsync(downloadCommand);
        
        // Verify files were downloaded
        await fs.access(modelFilePath);
        await fs.access(configFilePath);

        console.log(`✅ Downloaded voice model: ${modelName}`);
    } catch (error) {
        console.error(`❌ Failed to download voice model ${modelName}:`, error);
        
        // Clean up partial downloads
        try {
            await fs.unlink(modelFilePath);
            await fs.unlink(configFilePath);
        } catch {
            // Ignore cleanup errors
        }
        
        throw error;
    }
}

// Generate TTS audio using Piper
async function generateTTSWithPiper(text: string, voice: string, speed: number): Promise<Buffer> {
    const piperBinary = process.platform === 'win32' ? 'piper.exe' : 'piper';
    const piperPath = path.join(PIPER_PATH, piperBinary);
    const modelPath = VOICE_MODELS[voice as keyof typeof VOICE_MODELS];
    
    if (!modelPath) {
        throw new Error(`Unknown voice: ${voice}`);
    }

    const modelFile = path.basename(modelPath);
    const modelFilePath = path.join(MODEL_PATH, modelFile);

    // Ensure model exists
    try {
        await fs.access(modelFilePath);
    } catch {
        await downloadVoiceModel(voice);
    }

    // Generate unique temp file
    const tempFile = path.join(TTS_CACHE_DIR, `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`);
    const sanitizedText = sanitizeText(text);
    
    // Use length_scale for speed control (inverse relationship)
    const lengthScale = Math.max(0.5, Math.min(2.0, 1 / speed));

    try {
        // Write text to temporary file to avoid shell injection
        const textFile = tempFile.replace('.wav', '.txt');
        await fs.writeFile(textFile, sanitizedText, 'utf8');

        const command = process.platform === 'win32' 
            ? `"${piperPath}" --model "${modelFilePath}" --output_file "${tempFile}" --length_scale ${lengthScale} < "${textFile}"`
            : `"${piperPath}" --model "${modelFilePath}" --output_file "${tempFile}" --length_scale ${lengthScale} < "${textFile}"`;

        await execAsync(command, { timeout: 30000 }); // 30 second timeout

        const audioBuffer = await fs.readFile(tempFile);
        
        // Clean up temp files
        await fs.unlink(tempFile);
        await fs.unlink(textFile);
        
        return audioBuffer;
    } catch (error) {
        // Clean up temp files on error
        try {
            await fs.unlink(tempFile);
            await fs.unlink(tempFile.replace('.wav', '.txt'));
        } catch {
            // Ignore cleanup errors
        }
        throw error;
    }
}

// Fallback to Web Speech API format
function generateWebSpeechResponse(text: string, voice: string, speed: number) {
    return {
        type: 'web_speech',
        text: text,
        voice: voice,
        rate: speed,
        pitch: 1
    };
}

// TTS endpoint
router.post('/tts', async (req, res) => {
    try {
        const { text, voice = 'en_US-amy-medium', speed = 1.0, useCache = true }: TTSRequest = req.body;

        // Validation
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required and must be a string' });
        }

        if (text.length > 1000) {
            return res.status(400).json({ error: 'Text too long (max 1000 characters)' });
        }

        if (!(voice in VOICE_MODELS)) {
            return res.status(400).json({ error: 'Invalid voice model' });
        }

        if (speed < 0.5 || speed > 2.0) {
            return res.status(400).json({ error: 'Speed must be between 0.5 and 2.0' });
        }

        console.log(`🎤 TTS request: "${text.substring(0, 50)}..." with voice: ${voice}`);

        // Check cache first
        const cacheKey = getCacheKey(text, voice, speed);
        const cacheFilePath = path.join(TTS_CACHE_DIR, `${cacheKey}.wav`);

        if (useCache) {
            try {
                const audioBuffer = await fs.readFile(cacheFilePath);
                console.log(`💾 Serving from cache: ${cacheKey}`);
                res.set({
                    'Content-Type': 'audio/wav',
                    'Content-Length': audioBuffer.length,
                    'Cache-Control': 'public, max-age=31536000'
                });
                return res.send(audioBuffer);
            } catch {
                // Cache miss, continue to generation
            }
        }

        // Check if Piper is available
        if (!(await checkPiperInstallation())) {
            console.log('⚠️ Piper not installed, attempting installation...');
            try {
                await installPiper();
            } catch (installError) {
                console.log('⚠️ Piper installation failed, falling back to Web Speech API');
                return res.json(generateWebSpeechResponse(text, voice, speed));
            }
        }

        // Generate TTS with Piper
        try {
            const audioBuffer = await generateTTSWithPiper(text, voice, speed);

            // Cache the result
            if (useCache) {
                try {
                    await fs.writeFile(cacheFilePath, audioBuffer);
                } catch (cacheError) {
                    console.warn('Failed to cache TTS result:', cacheError);
                }
            }

            console.log(`✅ Generated TTS audio: ${audioBuffer.length} bytes`);

            res.set({
                'Content-Type': 'audio/wav',
                'Content-Length': audioBuffer.length,
                'Cache-Control': 'public, max-age=31536000'
            });
            res.send(audioBuffer);

        } catch (piperError) {
            console.error('❌ Piper TTS failed:', piperError);
            // Fallback to Web Speech API
            res.json(generateWebSpeechResponse(text, voice, speed));
        }

    } catch (error) {
        console.error('❌ TTS Error:', error);
        res.status(500).json({ 
            error: 'TTS generation failed',
            fallback: generateWebSpeechResponse(req.body.text || '', req.body.voice || 'en_US-amy-medium', req.body.speed || 1.0)
        });
    }
});

// Get available voices
router.get('/voices', async (req, res) => {
    try {
        const voices: VoiceInfo[] = Object.keys(VOICE_MODELS).map(voice => ({
            id: voice,
            name: voice.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            language: voice.split('_')[0] + '-' + voice.split('_')[1].split('-')[0],
            quality: voice.includes('high') ? 'high' : voice.includes('medium') ? 'medium' : 'low'
        }));

        const isInstalled = await checkPiperInstallation();
        
        res.json({
            voices,
            status: isInstalled ? 'ready' : 'needs_installation',
            platform: process.platform
        });
    } catch (error) {
        console.error('❌ Voices endpoint error:', error);
        res.status(500).json({ error: 'Failed to get voice information' });
    }
});

// Clear TTS cache
router.delete('/cache', async (req, res) => {
    try {
        const files = await fs.readdir(TTS_CACHE_DIR);
        let deletedCount = 0;

        await Promise.all(files.map(async (file) => {
            if (file.endsWith('.wav')) {
                try {
                    await fs.unlink(path.join(TTS_CACHE_DIR, file));
                    deletedCount++;
                } catch (error) {
                    console.warn(`Failed to delete cache file ${file}:`, error);
                }
            }
        }));

        res.json({ message: `Cleared ${deletedCount} cached TTS files` });
    } catch (error) {
        console.error('❌ Cache clear error:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const isInstalled = await checkPiperInstallation();
        const cacheStats = await fs.readdir(TTS_CACHE_DIR);
        
        res.json({
            status: 'ok',
            piper_installed: isInstalled,
            cache_files: cacheStats.filter(f => f.endsWith('.wav')).length,
            available_voices: Object.keys(VOICE_MODELS).length,
            platform: process.platform
        });
    } catch (error) {
        console.error('❌ Health check error:', error);
        res.status(500).json({ error: 'Health check failed' });
    }
});

export default router;