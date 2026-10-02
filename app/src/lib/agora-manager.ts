import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  type IRtcEngine,
} from 'react-native-agora';

class AgoraManager {
  private engine: IRtcEngine | null = null;

  async init(appId: string): Promise<void> {
    if (this.engine) return;
    this.engine = createAgoraRtcEngine();
    this.engine.initialize({ appId });
    this.engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
    this.engine.enableVideo();
  }

  async join(token: string, channelId: string, uid: number): Promise<void> {
    await this.engine?.joinChannel(token, channelId, uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  }

  async leave(): Promise<void> {
    await this.engine?.leaveChannel();
  }

  async muteAudio(muted: boolean): Promise<void> {
    await this.engine?.muteLocalAudioStream(muted);
  }

  async muteVideo(muted: boolean): Promise<void> {
    await this.engine?.muteLocalVideoStream(muted);
  }

  async startPreview(): Promise<void> {
    this.engine?.startPreview();
  }

  async stopPreview(): Promise<void> {
    this.engine?.stopPreview();
  }

  async switchCamera(): Promise<void> {
    await this.engine?.switchCamera();
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
