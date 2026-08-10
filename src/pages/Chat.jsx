import React, { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  addChatChannelMembers,
  apiFetch,
  createTaskFromChat,
  createChatChannel,
  createChatMessage,
  deleteChatChannel,
  deleteChatMessage,
  getChatBookmarks,
  getChatChannelMembers,
  getChatChannels,
  getChatMessages,
  getChatPins,
  getChatThread,
  getUserRoster,
  markChatChannelRead,
  removeChatChannelMember,
  searchChat,
  toggleChatBookmark,
  toggleChatPin,
  updateChatChannel,
  updateChatMessage,
  updateChatPreferences,
  toggleChatReaction
} from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { secureFileId, uploadPrivateFile } from "@/lib/uploads";
import SecureFileLink from "@/components/files/SecureFileLink";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Bookmark, FileText, ListTodo, MessageCircle, Pencil, Pin, Search, Trash2, Users } from "lucide-react";

const REACTION_OPTIONS = ["👍", "🎉", "❤️", "😂"];

function ChatAttachment({ file, mine }) {
  const fileId = secureFileId(file.file_url);
  const isImage = String(file.file_type || "").startsWith("image/");
  const previewQuery = useQuery({
    queryKey: ["chat-attachment-preview", fileId],
    queryFn: () => apiFetch(`/files/${fileId}/url`),
    enabled: Boolean(fileId && isImage),
    staleTime: 4 * 60 * 1000,
  });
  return <div><SecureFileLink href={file.file_url} target="_blank" rel="noreferrer" className={`block text-xs underline ${mine ? "text-white" : "text-[#835879]"}`}>{file.file_name || "Attachment"}</SecureFileLink>{previewQuery.data?.url && <img src={previewQuery.data.url} alt={file.file_name || "Chat attachment preview"} className="mt-2 max-h-52 rounded-md object-contain" />}</div>;
}

export default function Chat() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const me = queryClient.getQueryData(["me"]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEditMembers, setShowEditMembers] = useState(false);
  const [channelType, setChannelType] = useState("channel");
  const [channelName, setChannelName] = useState("");
  const [channelMembers, setChannelMembers] = useState([]);
  const [channelQuery, setChannelQuery] = useState("");
  const [channelSection, setChannelSection] = useState("channels");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [threadReply, setThreadReply] = useState("");
  const [mentionIds, setMentionIds] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [topicDraft, setTopicDraft] = useState("");

  const { data: channels = [] } = useQuery({
    queryKey: ["chat-channels"],
    queryFn: getChatChannels
  });

  const { data: roster = [] } = useQuery({
    queryKey: ["user-roster"],
    queryFn: getUserRoster
  });

  const messagesQuery = useInfiniteQuery({
    queryKey: ["chat-messages", selectedChannelId],
    queryFn: ({ pageParam }) => getChatMessages(selectedChannelId, { limit: 50, before: pageParam || undefined }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.next_before : undefined,
    enabled: !!selectedChannelId
  });
  const messagesPayload = useMemo(() => ({
    messages: (messagesQuery.data?.pages || []).flatMap((page) => page.messages || []),
    attachments: (messagesQuery.data?.pages || []).flatMap((page) => page.attachments || []),
    reactions: (messagesQuery.data?.pages || []).flatMap((page) => page.reactions || []),
  }), [messagesQuery.data?.pages]);

  const { data: channelMemberList = [] } = useQuery({
    queryKey: ["chat-members", selectedChannelId],
    queryFn: () => getChatChannelMembers(selectedChannelId),
    enabled: !!selectedChannelId
  });
  const threadQuery = useQuery({ queryKey: ["chat-thread", selectedChannelId, selectedThreadId], queryFn: () => getChatThread(selectedChannelId, selectedThreadId), enabled: Boolean(selectedChannelId && selectedThreadId) });
  const pinsQuery = useQuery({ queryKey: ["chat-pins", selectedChannelId], queryFn: () => getChatPins(selectedChannelId), enabled: Boolean(selectedChannelId && showPins) });
  const bookmarksQuery = useQuery({ queryKey: ["chat-bookmarks"], queryFn: getChatBookmarks, enabled: showBookmarks });
  const libraryQuery = useQuery({ queryKey: ["documents", "chat-attachments"], queryFn: () => apiFetch("/documents?status=active&limit=100"), enabled: showLibrary });

  const messages = useMemo(
    () => messagesPayload?.messages || [],
    [messagesPayload?.messages]
  );
  const attachmentMap = useMemo(() => {
    const map = new Map();
    for (const file of messagesPayload?.attachments || []) {
      if (!map.has(file.message_id)) map.set(file.message_id, []);
      map.get(file.message_id).push(file);
    }
    return map;
  }, [messagesPayload?.attachments]);

  const orderedMessages = useMemo(() => messages.slice().reverse(), [messages]);

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
    const requested = searchParams.get("channel_id");
    if (requested && requested !== selectedChannelId) {
      setSelectedChannelId(requested);
    }
  }, [searchParams, selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId) return;
    setShowEditMembers(false);
    markChatChannelRead(selectedChannelId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
      })
      .catch(() => null);
  }, [selectedChannelId, queryClient]);

  useEffect(() => {
    if (!selectedChannelId || !messagesPayload) return;
    markChatChannelRead(selectedChannelId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
      })
      .catch(() => null);
  }, [messagesPayload, selectedChannelId, queryClient]);

  useEffect(() => {
    if (!selectedChannelId) return;
    const handleEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
    };
    const timer = window.setInterval(handleEvent, 5000);
    return () => window.clearInterval(timer);
  }, [selectedChannelId, queryClient]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      const uploaded = await uploadPrivateFile({
        purpose: "chat-attachment",
        file
      });
      setAttachments((prev) => [
        ...prev,
        {
          file_id: uploaded.file_id,
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
    const wantsFred = /@fred\b/i.test(messageText);
    try {
      await createChatMessage(selectedChannelId, {
        body: messageText,
        attachments,
        mention_user_ids: mentionIds,
        mentions_fred: wantsFred
      });
      setMessageText("");
      setAttachments([]);
      setMentionIds([]);
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
      if (wantsFred) {
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", selectedChannelId]
          });
        }, 2500);
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", selectedChannelId]
          });
        }, 8000);
      }
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

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    try { setSearching(true); setSearchResults(await searchChat(searchQuery.trim())); }
    catch (error) { toast.error(error.message || "Chat search failed"); }
    finally { setSearching(false); }
  };

  const attachLibraryDocument = (document) => {
    setAttachments((current) => [...current, {
      library_document_id: document.id, library_version_id: document.version_id,
      file_name: document.file_name || document.title, file_type: document.mime_type,
      file_size: document.file_size,
    }]);
    setShowLibrary(false);
  };

  const refreshMessages = () => {
    queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedChannelId] });
    queryClient.invalidateQueries({ queryKey: ["chat-thread", selectedChannelId] });
    queryClient.invalidateQueries({ queryKey: ["chat-pins", selectedChannelId] });
    queryClient.invalidateQueries({ queryKey: ["chat-bookmarks"] });
  };

  const handleEditMessage = async () => {
    try { await updateChatMessage(editingMessage.id, editBody); setEditingMessage(null); setEditBody(""); refreshMessages(); toast.success("Message updated"); }
    catch (error) { toast.error(error.message || "Message could not be updated"); }
  };

  const handleDeleteMessage = async (message) => {
    if (!window.confirm("Delete this message? Its audit history will be retained.")) return;
    try { await deleteChatMessage(message.id); refreshMessages(); toast.success("Message deleted"); }
    catch (error) { toast.error(error.message || "Message could not be deleted"); }
  };

  const handleThreadReply = async () => {
    if (!threadReply.trim()) return;
    try { await createChatMessage(selectedChannelId, { body: threadReply, parent_message_id: selectedThreadId }); setThreadReply(""); refreshMessages(); }
    catch (error) { toast.error(error.message || "Reply could not be sent"); }
  };

  const handlePreference = async (level) => {
    try { await updateChatPreferences(selectedChannelId, level); queryClient.invalidateQueries({ queryKey: ["chat-channels"] }); toast.success("Channel notifications updated"); }
    catch (error) { toast.error(error.message || "Notification preference could not be saved"); }
  };

  const handleTopicSave = async () => {
    try { await updateChatChannel(selectedChannelId, { topic: topicDraft }); queryClient.invalidateQueries({ queryKey: ["chat-channels"] }); toast.success("Channel topic updated"); }
    catch (error) { toast.error(error.message || "Channel topic could not be updated"); }
  };

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId);
  const channelTitle = selectedChannel?.display_name || selectedChannel?.name || "Conversation";
  const canEditMembers = Boolean(selectedChannel?.can_manage);
  const canDeleteChannel = Boolean(selectedChannel?.can_manage);
  const filteredChannels = useMemo(() => channels.filter((channel) => {
    const sectionMatch = channelSection === "dms" ? channel.channel_type === "dm" : channel.channel_type !== "dm";
    const label = channel.display_name || channel.name || "Direct message";
    return sectionMatch && label.toLowerCase().includes(channelQuery.trim().toLowerCase());
  }), [channels, channelQuery, channelSection]);
  const currentMemberIds = useMemo(
    () => new Set(channelMemberList.map((member) => member.id)),
    [channelMemberList]
  );
  const availableMembers = useMemo(
    () => roster.filter((user) => !currentMemberIds.has(user.id)),
    [roster, currentMemberIds]
  );
  const memberList = channelMemberList
    .map((member) => member.full_name || member.email)
    .filter(Boolean)
    .join(", ");
  const firstUnreadId = useMemo(() => {
    const lastReadAt = selectedChannel?.last_read_at
      ? new Date(selectedChannel.last_read_at)
      : null;
    if (!lastReadAt) return null;
    const next = orderedMessages.find((msg) => {
      if (!msg.created_at) return false;
      return new Date(msg.created_at) > lastReadAt;
    });
    return next?.id || null;
  }, [selectedChannel?.last_read_at, orderedMessages]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let current = null;
    for (const msg of orderedMessages) {
      const createdAt = msg.created_at ? new Date(msg.created_at) : null;
      const authorKey = `${msg.author_type}-${msg.user_id || msg.email || "unknown"}`;
      const shouldStartNew =
        !current ||
        current.authorKey !== authorKey ||
        (createdAt &&
          current.lastAt &&
          Math.abs(createdAt.getTime() - current.lastAt.getTime()) > 5 * 60 * 1000);
      if (shouldStartNew) {
        current = {
          authorKey,
          authorType: msg.author_type,
          authorName:
            msg.author_type === "fred" ? "FRED" : msg.full_name || msg.email || "User",
          messages: [],
          firstAt: createdAt,
          lastAt: createdAt,
        };
        groups.push(current);
      }
      current.messages.push(msg);
      if (createdAt) current.lastAt = createdAt;
    }
    return groups;
  }, [orderedMessages]);

  const isMine = (msg) => msg.user_id && msg.user_id === me?.user?.id;

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return;
    const name = selectedChannel.display_name || selectedChannel.name || "this chat";
    const confirmed = window.confirm(
      selectedChannel.channel_type === "dm"
        ? `Delete ${name}? This will remove the thread for everyone.`
        : `Delete channel "${name}"? This will remove the channel for everyone.`
    );
    if (!confirmed) return;
    try {
      await deleteChatChannel(selectedChannel.id);
      setSelectedChannelId(null);
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      toast.success("Chat deleted");
    } catch (error) {
      toast.error(error?.message || "Unable to delete chat.");
    }
  };

  const handleAddMember = async (userId) => {
    if (!selectedChannelId || !userId) return;
    try {
      await addChatChannelMembers(selectedChannelId, [userId]);
      queryClient.invalidateQueries({ queryKey: ["chat-members", selectedChannelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
      toast.success("Member added");
    } catch (error) {
      toast.error(error?.message || "Unable to add member.");
    }
  };

  const handleRemoveMember = async (user) => {
    if (!selectedChannelId || !user?.id) return;
    const label = user.full_name || user.email || "this member";
    if (!window.confirm(`Remove ${label} from this channel?`)) return;
    try {
      await removeChatChannelMember(selectedChannelId, user.id);
      queryClient.invalidateQueries({ queryKey: ["chat-members", selectedChannelId] });
      queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
      toast.success("Member removed");
    } catch (error) {
      toast.error(error?.message || "Unable to remove member.");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto grid md:grid-cols-[280px_1fr] gap-6">
        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle className="text-lg">Chat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-1 rounded-md bg-slate-100 p-1"><Button size="sm" className="flex-1" variant={channelSection === "channels" ? "default" : "ghost"} onClick={() => setChannelSection("channels")}><Users className="mr-1 h-4 w-4" /> Channels</Button><Button size="sm" className="flex-1" variant={channelSection === "dms" ? "default" : "ghost"} onClick={() => setChannelSection("dms")}><MessageCircle className="mr-1 h-4 w-4" /> DMs</Button></div>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-8" value={channelQuery} onChange={(event) => setChannelQuery(event.target.value)} placeholder="Filter conversations" /></div>
            <div className="flex gap-1"><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSearch()} placeholder="Search all messages" /><Button size="icon" variant="outline" onClick={handleSearch} disabled={searching} aria-label="Search messages"><Search className="h-4 w-4" /></Button></div>
            {searchResults.length > 0 && <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2"><div className="flex items-center justify-between text-xs font-medium"><span>Search results</span><button onClick={() => setSearchResults([])}>Clear</button></div>{searchResults.map((result) => <button key={result.id} className="block w-full rounded p-2 text-left text-xs hover:bg-slate-50" onClick={() => { setSelectedChannelId(result.channel_id); setSearchResults([]); }}><strong>{result.channel_name || (result.channel_type === "dm" ? "Direct message" : "Channel")}</strong><span className="mt-1 block line-clamp-2 text-slate-500">{result.body || result.file_names || "Attachment"}</span></button>)}</div>}
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
            {filteredChannels.map((channel) => (
              <button
                key={channel.id}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  channel.id === selectedChannelId
                    ? "border-[#835879] bg-[#835879]/10 text-[#835879]"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => setSelectedChannelId(channel.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">
                    {channel.display_name ||
                      channel.name ||
                      (channel.channel_type === "dm" ? "Direct message" : "Channel")}
                  </div>
                  {Number(channel.unread_count) > 0 && (
                    <span className="rounded-full bg-[#835879] px-2 py-0.5 text-[10px] text-white">
                      {channel.unread_count}
                    </span>
                  )}
                </div>
                {channel.last_message && (
                  <div className="text-xs text-slate-500 line-clamp-1">
                    {channel.last_message}
                  </div>
                )}
                {channel.last_message_at && <div className="mt-1 text-[10px] text-slate-400">{new Date(channel.last_message_at).toLocaleString()}</div>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/80">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{channelTitle}</CardTitle>
                {selectedChannel?.topic && <p className="mt-1 text-sm text-slate-500">{selectedChannel.topic}</p>}
                {memberList && (
                  <div className="text-xs text-slate-500">
                    Members: {memberList}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedChannel && <select aria-label="Channel notifications" className="rounded-md border bg-white px-2 py-1 text-xs" value={selectedChannel.notification_level || "all"} onChange={(event) => handlePreference(event.target.value)}><option value="all">All messages</option><option value="mentions">Mentions only</option><option value="muted">Muted</option></select>}
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowPins(true)} disabled={!selectedChannel}><Pin className="h-3.5 w-3.5" /> Pins</Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowBookmarks(true)}><Bookmark className="h-3.5 w-3.5" /> Saved</Button>
                {canEditMembers && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowEditMembers((prev) => !prev); setTopicDraft(selectedChannel?.topic || ""); }}
                  >
                    {showEditMembers ? "Done" : "Edit members"}
                  </Button>
                )}
                {canDeleteChannel && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDeleteChannel}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showEditMembers && (
              <div className="grid gap-3 rounded-lg border bg-slate-50 p-3 text-sm md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><div className="font-medium">Channel topic</div><div className="flex gap-2"><Input value={topicDraft} onChange={(event) => setTopicDraft(event.target.value)} placeholder={selectedChannel?.topic || "What is this channel for?"} /><Button size="sm" onClick={handleTopicSave}>Save topic</Button></div></div>
                <div className="space-y-2">
                  <div className="font-medium">Current members</div>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {channelMemberList.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1"
                      >
                        <span className="min-w-0 truncate">
                          {member.full_name || member.email}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">Add members</div>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {availableMembers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1"
                      >
                        <span className="min-w-0 truncate">
                          {user.full_name || user.email}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddMember(user.id)}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                    {availableMembers.length === 0 && (
                      <div className="text-xs text-slate-500">
                        Everyone in the roster is already in this channel.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {messagesQuery.hasNextPage && <Button variant="outline" size="sm" className="w-full" disabled={messagesQuery.isFetchingNextPage} onClick={() => messagesQuery.fetchNextPage()}>{messagesQuery.isFetchingNextPage ? "Loading…" : "Load older messages"}</Button>}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {messages.length === 0 && (
                <div className="text-sm text-slate-500">No messages yet.</div>
              )}
              {groupedMessages.map((group, groupIndex) => {
                const dateLabel = group.firstAt
                  ? group.firstAt.toLocaleDateString()
                  : null;
                const prevGroup = groupedMessages[groupIndex - 1];
                const prevDateLabel =
                  prevGroup?.firstAt?.toLocaleDateString?.() || null;
                const showDate = dateLabel && dateLabel !== prevDateLabel;
                return (
                  <div key={`${group.authorKey}-${groupIndex}`} className="space-y-2">
                    {showDate && (
                      <div className="text-center text-xs text-slate-400">
                        {dateLabel}
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      {group.authorName}
                      {group.firstAt ? ` • ${group.firstAt.toLocaleTimeString()}` : ""}
                    </div>
                    <div className="space-y-2">
                      {group.messages.map((msg) => {
                        const files = attachmentMap.get(msg.id) || [];
                        const reactions = reactionMap.get(msg.id) || [];
                        const mine = isMine(msg);
                        const createdAt = msg.created_at ? new Date(msg.created_at) : null;
                        const showUnreadDivider = firstUnreadId === msg.id;
                        return (
                          <div key={msg.id} className="space-y-2">
                            {showUnreadDivider && (
                              <div className="text-center text-[11px] text-[#835879]">
                                New
                              </div>
                            )}
                            <div
                              className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                mine
                                  ? "bg-[#835879] text-white ml-auto"
                                  : "bg-white border"
                              }`}
                            >
                              {msg.body && <div className="whitespace-pre-wrap">{msg.body}</div>}
                              {msg.edited_at && <span className={`mt-1 block text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>(edited)</span>}
                              {files.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {files.map((file) => <ChatAttachment key={file.id} file={file} mine={mine} />)}
                                </div>
                              )}
                            </div>
                            <div
                              className={`text-[10px] text-slate-400 ${
                                mine ? "text-right" : ""
                              }`}
                            >
                              {createdAt ? createdAt.toLocaleString() : ""}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
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
                              <button className="rounded-full border px-2 py-0.5" onClick={() => setSelectedThreadId(msg.id)}><MessageCircle className="mr-1 inline h-3 w-3" />Reply{Number(msg.reply_count) ? ` (${msg.reply_count})` : ""}</button>
                              <button className={`rounded-full border px-2 py-0.5 ${msg.is_pinned ? "bg-amber-50" : ""}`} onClick={async () => { try { await toggleChatPin(msg.id); refreshMessages(); } catch (error) { toast.error(error.message); } }}><Pin className="mr-1 inline h-3 w-3" />{msg.is_pinned ? "Pinned" : "Pin"}</button>
                              <button className={`rounded-full border px-2 py-0.5 ${msg.is_bookmarked ? "bg-blue-50" : ""}`} onClick={async () => { try { await toggleChatBookmark(msg.id); refreshMessages(); } catch (error) { toast.error(error.message); } }}><Bookmark className="mr-1 inline h-3 w-3" />{msg.is_bookmarked ? "Saved" : "Save"}</button>
                              <button className="rounded-full border px-2 py-0.5" onClick={async () => { try { await createTaskFromChat(msg.id); toast.success("Task created in TaskMaster"); } catch (error) { toast.error(error.message); } }}><ListTodo className="mr-1 inline h-3 w-3" />Task</button>
                              {mine && <><button className="rounded-full border px-2 py-0.5" onClick={() => { setEditingMessage(msg); setEditBody(msg.body || ""); }}><Pencil className="mr-1 inline h-3 w-3" />Edit</button><button className="rounded-full border px-2 py-0.5 text-red-600" onClick={() => handleDeleteMessage(msg)}><Trash2 className="mr-1 inline h-3 w-3" />Delete</button></>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Type a message... (use @fred to ask for help)"
                rows={3}
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
                <Button type="button" variant="outline" className="gap-1" onClick={() => setShowLibrary(true)}><FileText className="h-4 w-4" /> Library</Button>
                <Button type="button" variant="outline" className="gap-1" onClick={() => setShowMentions((value) => !value)}><Bell className="h-4 w-4" /> Mention</Button>
                <Button onClick={handleSend}>Send</Button>
              </div>
              {showMentions && <div className="flex flex-wrap gap-2 rounded-md border p-2">{channelMemberList.filter((member) => member.id !== me?.user?.id).map((member) => <label key={member.id} className={`cursor-pointer rounded-full border px-2 py-1 text-xs ${mentionIds.includes(member.id) ? "bg-[#835879] text-white" : ""}`}><input type="checkbox" className="sr-only" checked={mentionIds.includes(member.id)} onChange={(event) => setMentionIds(event.target.checked ? [...mentionIds, member.id] : mentionIds.filter((id) => id !== member.id))} />@{member.full_name || member.email}</label>)}</div>}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">{attachments.map((attachment, index) => <Badge key={`${attachment.file_id || attachment.library_version_id}-${index}`} variant="outline" className="gap-2">{attachment.file_name || "Attachment"}<button aria-label={`Remove ${attachment.file_name || "attachment"}`} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></Badge>)}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showLibrary} onOpenChange={setShowLibrary}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Attach from Document Library</DialogTitle><DialogDescription>Only documents you can access are shown. Recipients still need Library permission to download the exact version.</DialogDescription></DialogHeader><div className="space-y-2">{(libraryQuery.data?.documents || []).map((document) => <button key={document.id} className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-slate-50" onClick={() => attachLibraryDocument(document)}><span><strong>{document.title}</strong><span className="block text-xs text-slate-500">Version {document.version_number}</span></span><FileText className="h-4 w-4" /></button>)}</div></DialogContent></Dialog>

      <Dialog open={Boolean(selectedThreadId)} onOpenChange={(open) => !open && setSelectedThreadId(null)}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Thread</DialogTitle><DialogDescription>Keep focused replies together without interrupting the main channel.</DialogDescription></DialogHeader><div className="space-y-3">{(threadQuery.data || []).map((message, index) => <div key={message.id} className={`rounded-lg border p-3 ${index === 0 ? "bg-slate-50" : "ml-5"}`}><div className="text-xs font-medium text-slate-500">{message.author_type === "fred" ? "FRED" : message.full_name || message.email || "User"}</div><p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p><time className="mt-2 block text-[10px] text-slate-400">{new Date(message.created_at).toLocaleString()}</time></div>)}<Textarea value={threadReply} onChange={(event) => setThreadReply(event.target.value)} placeholder="Reply in thread" /><Button disabled={!threadReply.trim()} onClick={handleThreadReply}>Reply</Button></div></DialogContent></Dialog>

      <Dialog open={showPins} onOpenChange={setShowPins}><DialogContent><DialogHeader><DialogTitle>Pinned messages</DialogTitle><DialogDescription>Important information saved for everyone in this channel.</DialogDescription></DialogHeader><div className="space-y-2">{(pinsQuery.data || []).map((pin) => <div key={pin.id} className="rounded-md border p-3"><p className="text-sm">{pin.body}</p><p className="mt-1 text-xs text-slate-500">{pin.full_name || pin.email || "User"}</p></div>)}{!pinsQuery.isLoading && !(pinsQuery.data || []).length && <p className="text-sm text-slate-500">No pinned messages.</p>}</div></DialogContent></Dialog>

      <Dialog open={showBookmarks} onOpenChange={setShowBookmarks}><DialogContent><DialogHeader><DialogTitle>Saved messages</DialogTitle><DialogDescription>Your private message bookmarks across Chat.</DialogDescription></DialogHeader><div className="space-y-2">{(bookmarksQuery.data || []).map((bookmark) => <button key={bookmark.id} className="block w-full rounded-md border p-3 text-left" onClick={() => { setSelectedChannelId(bookmark.channel_id); setShowBookmarks(false); }}><p className="text-sm">{bookmark.body}</p><p className="mt-1 text-xs text-slate-500">{bookmark.channel_name || "Direct message"}</p></button>)}{!bookmarksQuery.isLoading && !(bookmarksQuery.data || []).length && <p className="text-sm text-slate-500">No saved messages.</p>}</div></DialogContent></Dialog>

      <Dialog open={Boolean(editingMessage)} onOpenChange={(open) => !open && setEditingMessage(null)}><DialogContent><DialogHeader><DialogTitle>Edit message</DialogTitle><DialogDescription>The edited timestamp will remain visible.</DialogDescription></DialogHeader><Textarea rows={5} value={editBody} onChange={(event) => setEditBody(event.target.value)} /><Button disabled={!editBody.trim()} onClick={handleEditMessage}>Save edit</Button></DialogContent></Dialog>
    </div>
  );
}
