import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChatChannel,
  createChatMessage,
  getChatChannelMembers,
  getChatChannels,
  getChatMessages,
  getUserRoster,
  toggleChatReaction,
  API_BASE
} from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadPublicFile } from "@/lib/uploads";
import { toast } from "sonner";

const REACTION_OPTIONS = ["👍", "🎉", "❤️", "😂"];

export default function Chat() {
  const queryClient = useQueryClient();
  const me = queryClient.getQueryData(["me"]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [channelType, setChannelType] = useState("channel");
  const [channelName, setChannelName] = useState("");
  const [channelMembers, setChannelMembers] = useState([]);

  const { data: channels = [] } = useQuery({
    queryKey: ["chat-channels"],
    queryFn: getChatChannels
  });

  const { data: roster = [] } = useQuery({
    queryKey: ["user-roster"],
    queryFn: getUserRoster
  });

  const { data: messagesPayload } = useQuery({
    queryKey: ["chat-messages", selectedChannelId],
    queryFn: () => getChatMessages(selectedChannelId),
    enabled: !!selectedChannelId
  });

  const { data: channelMembers = [] } = useQuery({
    queryKey: ["chat-members", selectedChannelId],
    queryFn: () => getChatChannelMembers(selectedChannelId),
    enabled: !!selectedChannelId
  });

  const messages = messagesPayload?.messages || [];
  const attachmentMap = useMemo(() => {
    const map = new Map();
    for (const file of messagesPayload?.attachments || []) {
      if (!map.has(file.message_id)) map.set(file.message_id, []);
      map.get(file.message_id).push(file);
    }
    return map;
  }, [messagesPayload?.attachments]);

  const reactionMap = useMemo(() => {
    const map = new Map();
    for (const reaction of messagesPayload?.reactions || []) {
      if (!map.has(reaction.message_id)) map.set(reaction.message_id, []);
      map.get(reaction.message_id).push(reaction);
    }
    return map;
  }, [messagesPayload?.reactions]);

  useEffect(() => {
    if (!selectedChannelId && channels.length > 0) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId) return;
    const userId = me?.user?.id || "";
    const userEmail = me?.user?.email || "";
    const url = new URL(`${API_BASE}/chat/stream`, window.location.origin);
    url.searchParams.set("channel_id", selectedChannelId);
    if (userId) url.searchParams.set("user_id", userId);
    if (userEmail) url.searchParams.set("user_email", userEmail);
    const source = new EventSource(url.toString());
    const handleEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
    };
    source.addEventListener("message", handleEvent);
    source.addEventListener("reaction", handleEvent);
    source.onerror = () => {
      source.close();
    };
    return () => {
      source.close();
    };
  }, [selectedChannelId, me?.user?.id, me?.user?.email, queryClient]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      const uploaded = await uploadPublicFile({
        bucket: "uploads",
        pathPrefix: "chat-uploads",
        file
      });
      setAttachments((prev) => [
        ...prev,
        {
          file_url: uploaded.file_url,
          file_name: uploaded.file_name || file.name,
          file_type: file.type,
          file_size: file.size
        }
      ]);
    } catch (error) {
      toast.error(error?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedChannelId) return;
    if (!messageText.trim() && attachments.length === 0) {
      toast.error("Write a message or attach a file.");
      return;
    }
    try {
      await createChatMessage(selectedChannelId, {
        body: messageText,
        attachments
      });
      setMessageText("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
    } catch (error) {
      toast.error(error?.message || "Unable to send message.");
    }
  };

  const handleCreateChannel = async () => {
    if (channelType === "channel" && !channelName.trim()) {
      toast.error("Channel name is required.");
      return;
    }
    if (channelMembers.length === 0) {
      toast.error("Select at least one member.");
      return;
    }
    try {
      const channel = await createChatChannel({
        channel_type: channelType,
        name: channelType === "channel" ? channelName.trim() : null,
        member_ids: channelMembers
      });
      setSelectedChannelId(channel.id);
      setChannelName("");
      setChannelMembers([]);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
    } catch (error) {
      toast.error(error?.message || "Unable to create channel.");
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await toggleChatReaction(messageId, emoji);
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannelId] });
    } catch (error) {
      toast.error(error?.message || "Unable to update reaction.");
    }
  };

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId);
  const channelTitle = selectedChannel?.display_name || selectedChannel?.name || "Conversation";
  const memberList = channelMembers
    .map((member) => member.full_name || member.email)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[280px_1fr] gap-6">
        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle className="text-lg">Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreate((prev) => !prev)}
              >
                {showCreate ? "Cancel" : "New channel"}
              </Button>
            </div>
            {showCreate && (
              <div className="space-y-2 rounded-lg border p-2 text-sm">
                <select
                  value={channelType}
                  onChange={(event) => setChannelType(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1"
                >
                  <option value="channel">Channel</option>
                  <option value="dm">Direct message</option>
                </select>
                {channelType === "channel" && (
                  <Input
                    value={channelName}
                    onChange={(event) => setChannelName(event.target.value)}
                    placeholder="Channel name"
                  />
                )}
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {roster.map((user) => {
                    const checked = channelMembers.includes(user.id);
                    return (
                      <label key={user.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setChannelMembers((prev) => [...prev, user.id]);
                            } else {
                              setChannelMembers((prev) =>
                                prev.filter((id) => id !== user.id)
                              );
                            }
                          }}
                        />
                        <span>{user.full_name || user.email}</span>
                      </label>
                    );
                  })}
                </div>
                <Button size="sm" onClick={handleCreateChannel}>
                  Create
                </Button>
              </div>
            )}
            {channels.length === 0 && (
              <div className="text-sm text-slate-500">No channels yet.</div>
            )}
            {channels.map((channel) => (
              <button
                key={channel.id}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  channel.id === selectedChannelId
                    ? "border-[#835879] bg-[#835879]/10 text-[#835879]"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => setSelectedChannelId(channel.id)}
              >
                <div className="font-medium">
                  {channel.name || (channel.channel_type === "dm" ? "Direct message" : "Channel")}
                </div>
                {channel.last_message && (
                  <div className="text-xs text-slate-500 line-clamp-1">
                    {channel.last_message}
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle className="text-lg">{channelTitle}</CardTitle>
            {memberList && (
              <div className="text-xs text-slate-500">
                Members: {memberList}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {messages.length === 0 && (
                <div className="text-sm text-slate-500">No messages yet.</div>
              )}
              {messages
                .slice()
                .reverse()
                .map((msg) => {
                  const files = attachmentMap.get(msg.id) || [];
                  const reactions = reactionMap.get(msg.id) || [];
                  return (
                    <div key={msg.id} className="rounded-lg border px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {msg.author_type === "fred"
                            ? "FRED"
                            : msg.full_name || msg.email || "User"}
                        </span>
                        <span>
                          {msg.created_at
                            ? new Date(msg.created_at).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      {msg.body && <div className="text-sm">{msg.body}</div>}
                      {files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {files.map((file) => (
                            <a
                              key={file.id}
                              href={file.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-xs text-[#835879] underline"
                            >
                              {file.file_name || "Attachment"}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {REACTION_OPTIONS.map((emoji) => {
                          const count = reactions.filter((r) => r.emoji === emoji).length;
                          return (
                            <button
                              key={`${msg.id}-${emoji}`}
                              className="rounded-full border px-2 py-0.5"
                              onClick={() => handleReaction(msg.id, emoji)}
                            >
                              {emoji} {count > 0 ? count : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="space-y-2">
              <Input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Type a message... (use @fred to ask for help)"
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="chat-attachment"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("chat-attachment")?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Add attachment"}
                </Button>
                <Button onClick={handleSend}>Send</Button>
              </div>
              {attachments.length > 0 && (
                <div className="text-xs text-slate-500">
                  {attachments.length} attachment(s) ready to send.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
