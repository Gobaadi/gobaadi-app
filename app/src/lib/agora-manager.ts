import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  AudioProfileType,
  type IRtcEngine,
} from 'react-native-agora';

class AgoraManager {
  private engine: IRtcEngine | null = null;
  private previewActive = false;

  async init(appId: string): Promise<void> {
    if (this.engine) return;
    try {
      this.engine = createAgoraRtcEngine();
    } catch {
      throw new Error(
        'Call engine unavailable — Expo Go is not supported, use a development build',
      );
    }
    this.engine.initialize({ appId });
    this.engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
    // Louder, clearer call audio: higher-quality encoding than the default
    // 18 Kbps speech profile, boosted capture + playback signal, and speaker
    // as the default route (communication profile otherwise starts at earpiece).
    this.engine.setAudioProfile(AudioProfileType.AudioProfileMusicStandard);
    this.engine.setDefaultAudioRouteToSpeakerphone(true);
    this.engine.adjustRecordingSignalVolume(150);
    this.engine.adjustPlaybackSignalVolume(200);
    this.engine.enableVideo();
  }

  async join(token: string, channelId: string, uid: number): Promise<void> {
    await this.engine?.joinChannel(token, channelId, uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  }

  async leave(): Promise<void> {
    this.previewActive = false;
    await this.engine?.leaveChannel();
  }

  async renewToken(token: string): Promise<void> {
    this.engine?.renewToken(token);
  }

  async muteAudio(muted: boolean): Promise<void> {
    await this.engine?.muteLocalAudioStream(muted);
  }

  async muteVideo(muted: boolean): Promise<void> {
    await this.engine?.muteLocalVideoStream(muted);
  }

  async startPreview(): Promise<void> {
    if (this.previewActive) return;
    this.previewActive = true;
    this.engine?.startPreview();
  }

  async stopPreview(): Promise<void> {
    if (!this.previewActive) return;
    this.previewActive = false;
    this.engine?.stopPreview();
  }

  async switchCamera(): Promise<void> {
    await this.engine?.switchCamera();
  }

  /** Toggle audio route between loudspeaker and earpiece for this channel. */
  setSpeaker(speakerOn: boolean): void {
    this.engine?.setEnableSpeakerphone(speakerOn);
  }

  isSpeakerOn(): boolean {
    return this.engine?.isSpeakerphoneEnabled() ?? true;
  }

  getEngine(): IRtcEngine | null {
    return this.engine;
  }

  destroy(): void {
    this.engine?.release();
    this.engine = null;
  }
}

export const agoraManager = new AgoraManager();
