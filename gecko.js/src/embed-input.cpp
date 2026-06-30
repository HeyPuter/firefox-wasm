// Input injection (synthesized mouse/keyboard/wheel) + clipboard priming. Split
// from embed-xul.cpp. See embed-xul.h.
#include "embed-xul.h"
// Synthesize a mouse event (evType: 0 move, 1 down, 2 up) at CSS px (x,y) and
// dispatch it through the full event path (hit-testing, focus, click synthesis).
void do_mouse(int evType, int x, int y, int button, int clickCount,
                     int buttons, int modifiers) {
  using namespace mozilla;
  if (!g_docShell) return;
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return;
  nsPresContext* pc = ps->GetPresContext();
  nsPoint offset;
  nsIWidget* widget = nsContentUtils::GetWidget(ps, &offset);
  if (!widget || !pc) return;

  // Outside-click rollup: native widgets roll popups up when you click off them
  // (the widget's rollup listener); the headless widget never delivers that, so do
  // it here. On a mousedown outside every open popup, roll them all up and consume
  // the click so it doesn't also fall through to content -- matching native menu
  // behavior. Clicks inside a popup fall through (menu item activation).
  if (evType == 1) {
    if (nsXULPopupManager* pm = nsXULPopupManager::GetInstance()) {
      nsTArray<nsMenuPopupFrame*> popups;
      pm->GetVisiblePopups(popups);
      if (!popups.IsEmpty()) {
        bool inside = false;
        for (auto* pf : popups) {
          if (!pf) continue;
          LayoutDeviceIntRect b = pf->CalcWidgetBounds();
          if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) {
            inside = true;
            break;
          }
        }
        if (!inside) {
          nsIRollupListener::RollupOptions opts;
          opts.mCount = 0;  // close all open popups
          pm->Rollup(opts, nullptr);
          return;  // consume the dismissing click
        }
      }
    }
  }

  LayoutDeviceIntPoint ref =
      nsContentUtils::ToWidgetPoint(CSSPoint(x, y), offset, pc);
  // evType: 0=mousemove 1=mousedown 2=mouseup 3=contextmenu. A synthesized right
  // mousedown/up doesn't generate eContextMenu in this headless build, so the JS
  // side sends an explicit contextmenu event (button 2) to open context menus.
  const char* typeStr =
      evType == 1 ? "mousedown"
                  : (evType == 2 ? "mouseup"
                                 : (evType == 3 ? "contextmenu" : "mousemove"));
  nsAutoString type;
  type.AssignASCII(typeStr);

  dom::SynthesizeMouseEventData data;
  data.mButton = button;
  data.mModifiers = modifiers;
  data.mInputSource = 1;  // MouseEvent.MOZ_SOURCE_MOUSE
  if (buttons >= 0) data.mButtons.Construct(buttons);
  if (clickCount > 0) data.mClickCount.Construct(clickCount);
  dom::SynthesizeMouseEventOptions options;  // defaults are fine
  dom::Optional<OwningNonNull<dom::VoidFunction>> noCallback;

  auto rv = nsContentUtils::SynthesizeMouseEvent(ps, widget, type, ref, data,
                                                 options, noCallback);
  (void)rv;

  // Capture the cursor the content specifies under the pointer so the host page
  // can mirror it (cursor: pointer over links, text over inputs, resize handles,
  // etc.). This is what EventStateManager::UpdateCursor feeds the widget; we read
  // it back from the frame since the windowless widget's SetCursor is a no-op.
  if (g_cmd) {
    int32_t a = AppUnitsPerCSSPixel();
    nsPoint rootPt(x * a, y * a);
    int kind = (int)StyleCursorKind::Auto;
    if (nsIFrame* root = ps->GetRootFrame()) {
      if (nsIFrame* target =
              nsLayoutUtils::GetFrameForPoint(RelativeTo{root}, rootPt)) {
        nsPoint framePt = rootPt - target->GetOffsetTo(root);
        kind = (int)target->GetCursor(framePt).mCursor;
      }
    }
    g_cmd->cursor = kind;
  }
}

// Synthesize a wheel (scroll) event at CSS px (x,y) with pixel deltas, mirroring
// the tested EventUtils.synthesizeWheel path.
void do_wheel(int x, int y, double dx, double dy, int modifiers) {
  using namespace mozilla;
  if (!g_docShell) return;
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return;
  nsPresContext* pc = ps->GetPresContext();
  nsPoint offset;
  nsIWidget* widget = nsContentUtils::GetWidget(ps, &offset);
  if (!widget || !pc) return;

  ScrollContainerFrame* sf = ps->GetRootScrollContainerFrame();
  nsPoint before = sf ? sf->GetScrollPosition() : nsPoint();

  WidgetWheelEvent ev(true, eWheel, widget);
  ev.mModifiers = nsContentUtils::GetWidgetModifiers(modifiers);
  ev.mDeltaX = dx;
  ev.mDeltaY = dy;
  ev.mDeltaZ = 0.0;
  ev.mDeltaMode = 0;  // WheelEvent.DOM_DELTA_PIXEL
  ev.mLineOrPageDeltaX = dx > 0 ? (int32_t)std::floor(dx) : (int32_t)std::ceil(dx);
  ev.mLineOrPageDeltaY = dy > 0 ? (int32_t)std::floor(dy) : (int32_t)std::ceil(dy);
  ev.mRefPoint = nsContentUtils::ToWidgetPoint(CSSPoint(x, y), offset, pc);

  // With APZ enabled (GPU mode), route the wheel through the APZ input bridge so the
  // scroll is handled ASYNCHRONOUSLY on the compositor (async scroll transform sampled
  // per composite) instead of a synchronous main-thread display-list rebuild. APZ owns
  // applying the scroll, so do NOT also scroll the root frame ourselves.
  static bool s_apzLogged = false;
  if (!s_apzLogged) {
    s_apzLogged = true;
    printf("do_wheel: widget AsyncPanZoomEnabled=%d\n", widget->AsyncPanZoomEnabled());
    fflush(stdout);
  }
  if (widget->AsyncPanZoomEnabled()) {
    nsIWidget::ContentAndAPZEventStatus st = widget->DispatchInputEvent(&ev);
    static int s_apzResN = 0;
    if (s_apzResN < 5) {
      s_apzResN++;
      printf("APZ-DIAG do_wheel result: apzStatus=%d contentStatus=%d\n",
             (int)st.mApzStatus, (int)st.mContentStatus);
      fflush(stdout);
    }
    return;
  }

  // Non-APZ (software) path: the dispatched wheel event is "consumed" by the event
  // manager (eConsumeNoDefault) but the scroll isn't applied. If the position didn't
  // move and content didn't preventDefault (e.g. a custom scroller / map), apply the
  // scroll to the root scroll frame ourselves. Use Smooth mode so the GPU compositor
  // animates it over refresh-driver ticks.
  widget->DispatchEvent(&ev);
  if (sf && sf->GetScrollPosition() == before && !ev.DefaultPrevented()) {
    sf->ScrollToCSSPixels(
        CSSPoint::FromAppUnits(before) + CSSPoint((float)dx, (float)dy),
        ScrollMode::Smooth);
  }
}

// Build + dispatch one keyboard event of the given message through the widget.
static void dispatch_key(nsIWidget* widget, mozilla::EventMessage msg,
                         const nsAString& key, int keyCode, int charCode,
                         int modifiers) {
  using namespace mozilla;
  WidgetKeyboardEvent ev(true, msg, widget);
  KeyNameIndex kni = WidgetKeyboardEvent::GetKeyNameIndex(key);
  ev.mKeyNameIndex = kni;
  if (kni == KEY_NAME_INDEX_USE_STRING) ev.mKeyValue = key;
  ev.mCodeNameIndex = CODE_NAME_INDEX_UNKNOWN;
  ev.mModifiers = nsContentUtils::GetWidgetModifiers(modifiers);
  if (msg == eKeyPress && charCode) {
    // Printable keypress: mCharCode gates text insertion (IsInputtingText),
    // mKeyValue carries the inserted string; DOM keyCode is 0 for printables.
    ev.mCharCode = charCode;
    ev.mKeyCode = 0;
  } else {
    ev.mKeyCode = keyCode ? keyCode
                          : (kni != KEY_NAME_INDEX_USE_STRING
                                 ? WidgetKeyboardEvent::
                                       ComputeKeyCodeFromKeyNameIndex(kni)
                                 : 0);
  }
  widget->DispatchEvent(&ev);
}

// Synthesize a keyboard event (evType: 0 keydown, 1 keyup). On keydown, also
// dispatch a keypress for non-modifier keys (matching DOM ordering), which is
// what drives text insertion + editor commands.
void do_key(int evType, const char* keyUtf8, int keyCode, int charCode,
                   int modifiers) {
  using namespace mozilla;
  if (!g_docShell) return;
  PresShell* ps = g_docShell->GetPresShell();
  if (!ps) return;
  nsPoint offset;
  nsIWidget* widget = nsContentUtils::GetWidget(ps, &offset);
  if (!widget) return;

  NS_ConvertUTF8toUTF16 key(keyUtf8);
  KeyNameIndex kni = WidgetKeyboardEvent::GetKeyNameIndex(key);
  bool isModifierKey = WidgetKeyboardEvent::GetModifierForKeyName(kni) !=
                       MODIFIER_NONE;
  if (evType == 0) {
    dispatch_key(widget, eKeyDown, key, keyCode, 0, modifiers);
    if (!isModifierKey) {
      dispatch_key(widget, eKeyPress, key, keyCode, charCode, modifiers);
    }
  } else {
    dispatch_key(widget, eKeyUp, key, keyCode, 0, modifiers);
  }
}

// Store UTF-8 text on the global clipboard via the normal nsIClipboard path (the
// headless clipboard). Used to prime the clipboard from the system clipboard
// (navigator.clipboard) just before a native paste; see OP 9 / pasteThenKey in the
// JS loader. HeadlessClipboard::SetNativeClipboardData also mirrors back out to
// navigator.clipboard, which for a paste is the same text -- harmless.
bool set_clipboard_text(const char* utf8) {
  using namespace mozilla;
  if (!utf8) return false;
  nsCOMPtr<nsIClipboard> clipboard =
      do_GetService("@mozilla.org/widget/clipboard;1");
  if (!clipboard) return false;
  nsCOMPtr<nsITransferable> trans =
      do_CreateInstance("@mozilla.org/widget/transferable;1");
  if (!trans) return false;
  trans->Init(nullptr);
  trans->AddDataFlavor(kTextMime);
  nsCOMPtr<nsISupportsString> data =
      do_CreateInstance("@mozilla.org/supports-string;1");
  if (!data) return false;
  data->SetData(NS_ConvertUTF8toUTF16(utf8));
  trans->SetTransferData(kTextMime, ToSupports(data));
  return NS_SUCCEEDED(
      clipboard->SetData(trans, nullptr, nsIClipboard::kGlobalClipboard, nullptr));
}
