"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { chatbotApi } from "../../lib/api/chatbot";
import type { ChatReply, PublicAIConfig } from "../../lib/types/chatbot";
import { subscribeMockData, USE_MOCK } from "../../lib/mock/config";
import { formatPrice } from "../../lib/utils/format";
import { imageSrc } from "../../lib/utils/image";

export const OPEN_CHAT_EVENT = "bookstore:open-chat";
export default function Chatbot() {
  const { user, isLoading } = useAuth();
  return isLoading ? null : <ChatWindow key={user?.id ?? "guest"} />;
}
function ChatWindow() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PublicAIConfig | null>(null);
  const [turns, setTurns] = useState<{ question: string; reply: ChatReply }[]>(
    [],
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState("");
  const session = useRef<string | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const opener = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    alive.current = true;
    const load = () =>
      void chatbotApi
        .getConfig()
        .then((value) => {
          if (active) {
            setConfig(value);
            setConfigError("");
          }
        })
        .catch((caught) => {
          if (active)
            setConfigError(
              caught instanceof Error
                ? caught.message
                : "Không kết nối được chatbot.",
            );
        });
    const onOpen = () => {
      setOpen(true);
      load();
    };
    load();
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    const unsubscribe = USE_MOCK ? subscribeMockData(load) : () => {};
    return () => {
      active = false;
      alive.current = false;
      unsubscribe();
      window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
    };
  }, []);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: "nearest" });
  }, [open, turns, sending]);
  function close() {
    setOpen(false);
    opener.current?.focus();
  }
  async function send(value = message) {
    if (busy.current || !value.trim() || !config?.enabled) return;
    busy.current = true;
    setSending(true);
    setError("");
    session.current ??= crypto.randomUUID();
    try {
      const reply = await chatbotApi.send({
        message: value.trim(),
        sessionId: session.current,
      });
      if (alive.current) {
        setTurns((items) => [...items, { question: value.trim(), reply }]);
        setMessage("");
      }
    } catch (caught) {
      if (alive.current) {
        setMessage(value);
        setError(
          caught instanceof Error
            ? caught.message
            : "Không gửi được tin nhắn. Hãy thử lại.",
        );
      }
    } finally {
      busy.current = false;
      if (alive.current) {
        setSending(false);
        input.current?.focus();
      }
    }
  }
  return (
    <div className="chatbot-widget">
      {open && (
        <section
          id="bookstore-chat"
          role="dialog"
          aria-labelledby="chat-title"
          className="chatbot-window"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          <header className="chatbot-heading">
            <span className="chatbot-mark">
              <i className="fa fa-comments-o" aria-hidden="true" />
            </span>
            <div>
              <h2 id="chat-title">{config?.botName ?? "Tư vấn chọn sách"}</h2>
              <small>
                {config?.enabled === false
                  ? "Đang tạm nghỉ"
                  : "Tư vấn sách & chăm sóc khách hàng"}
              </small>
            </div>
            <button type="button" aria-label="Đóng cửa sổ chat" onClick={close}>
              <i className="fa fa-times" aria-hidden="true" />
            </button>
          </header>
          <div
            className="chatbot-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-busy={sending}
          >
            {config && (
              <div className="chat-bubble assistant">
                {config.welcomeMessage}
              </div>
            )}
            {configError && (
              <p role="alert" className="feature-error">
                {configError}{" "}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setConfig(await chatbotApi.getConfig());
                      setConfigError("");
                    } catch {
                      setConfigError(
                        "Không kết nối được chatbot. Vui lòng thử lại sau.",
                      );
                    }
                  }}
                >
                  Thử kết nối lại
                </button>
              </p>
            )}
            {!config && !configError && <p>Đang kết nối…</p>}
            {turns.map(({ question, reply }) => (
              <div className="chat-turn" key={reply.id}>
                <div className="chat-bubble customer">
                  <span className="sr-only">Bạn: </span>
                  {question}
                </div>
                <div className="chat-bubble assistant">
                  <span className="sr-only">Trợ lý: </span>
                  {reply.answer}
                </div>
                {!!reply.books.length && (
                  <div className="chat-book-list">
                    {reply.books.map((book) => (
                      <Link
                        href={`/client/products/${book.id}`}
                        key={book.id}
                        className="chat-book"
                        onClick={close}
                      >
                        <Image
                          unoptimized
                          src={
                            imageSrc(book.imageUrl) ??
                            "/images/bookstore-logo.svg"
                          }
                          alt=""
                          width={38}
                          height={52}
                        />
                        <span>
                          <strong>{book.name}</strong>
                          <small>{book.author}</small>
                          <b>{formatPrice(book.price)}</b>
                        </span>
                        <i className="fa fa-angle-right" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                )}
                {reply.needsHuman && (
                  <div className="chat-support-links">
                    <Link href="/client/orders" onClick={close}>
                      Xem đơn hàng
                    </Link>
                    <Link href="/client/warranty" onClick={close}>
                      Yêu cầu đổi trả
                    </Link>
                  </div>
                )}
              </div>
            ))}
            {sending && <p className="chat-typing">Trợ lý đang trả lời…</p>}
            {error && (
              <p role="alert" className="feature-error">
                {error}
              </p>
            )}
            <div ref={end} />
          </div>
          {config?.enabled && (
            <div className="chat-suggestions">
              {[
                "Gợi ý sách thiếu nhi",
                "Sách kỹ năng dưới 200k",
                "Liên hệ nhân viên",
              ].map((text) => (
                <button
                  type="button"
                  key={text}
                  disabled={sending}
                  onClick={() => void send(text)}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
          {config?.enabled === false && (
            <p className="chat-offline">
              Chatbot đang tạm nghỉ. Liên hệ: {config.supportContact}
            </p>
          )}
          <form
            className="chatbot-compose"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              ref={input}
              aria-label="Tin nhắn tư vấn sách"
              placeholder="Bạn đang tìm cuốn sách như thế nào?"
              value={message}
              maxLength={2000}
              rows={2}
              disabled={!config?.enabled || sending}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="submit"
              className="solid-button"
              aria-label="Gửi tin nhắn"
              disabled={!message.trim() || !config?.enabled || sending}
            >
              <i
                className={`fa ${sending ? "fa-spinner fa-spin" : "fa-paper-plane-o"}`}
                aria-hidden="true"
              />
            </button>
          </form>
          <footer className="chatbot-disclaimer">
            {USE_MOCK
              ? "Demo: gợi ý tự động từ danh mục sách hiện có."
              : "Nội dung AI có thể có sai sót. Vui lòng kiểm tra chi tiết sách."}{" "}
            Không gửi thông tin nhạy cảm.
          </footer>
        </section>
      )}
      <button
        ref={opener}
        type="button"
        className="chatbot-launcher"
        aria-expanded={open}
        aria-controls="bookstore-chat"
        onClick={() => {
          if (open) close();
          else {
            setOpen(true);
            void chatbotApi
              .getConfig()
              .then(setConfig)
              .catch(() => setConfigError("Không kết nối được chatbot."));
          }
        }}
      >
        <i
          className={`fa ${open ? "fa-times" : "fa-comments-o"}`}
          aria-hidden="true"
        />
        <span>{open ? "Đóng tư vấn" : "Hỏi BookStore AI"}</span>
      </button>
    </div>
  );
}
