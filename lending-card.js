/* Lending Card v1.1.1 — MIT License. No build step or external dependencies. */
(() => {
  "use strict";
  const VERSION = "1.1.1";
  const DEFAULTS = { title: "Lending", hide_completed: true, columns: 2, sort: "due" };
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const message = (error) => error?.message || String(error);
  const icon = (name) => `<ha-icon icon="mdi:${name}" aria-hidden="true"></ha-icon>`;

  class LendingCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._items = [];
      this._loaded = false;
      this._loading = false;
      this._busy = false;
      this._generation = 0;
      this._request = 0;
      this._error = "";
      this._draft = null;
    }
    static async getConfigElement() {
      // Load HA's own to-do editor to make its shared form components available.
      if (window.loadCardHelpers) {
        const helpers = await window.loadCardHelpers();
        const card = helpers.createCardElement({ type: "todo-list", entity: "todo.lending" });
        if (card.constructor.getConfigElement) await card.constructor.getConfigElement();
      }
      return document.createElement("lending-card-editor");
    }
    static getStubConfig(hass) {
      const entity = hass.states["todo.lending"] ? "todo.lending" :
        Object.keys(hass.states).find((id) => id.startsWith("todo."));
      return { type: "custom:lending-card", entity, ...DEFAULTS };
    }
    setConfig(config) {
      if (!config.entity?.startsWith("todo.")) throw new Error("Select a to-do list entity.");
      if (config.columns !== undefined && ![1, 2, 3, 4].includes(Number(config.columns))) {
        throw new Error("Columns must be between 1 and 4.");
      }
      const changed = this._config?.entity !== config.entity;
      this._config = { ...DEFAULTS, ...config, columns: Number(config.columns ?? 2) };
      if (changed) {
        this._generation++;
        this._request++;
        this._loading = false;
        this._loaded = false;
        this._items = [];
        this._draft = null;
        this._error = "";
        this._lastState = undefined;
      }
      this._render();
      if (changed) this._refresh();
    }
    set hass(hass) {
      const connectionChanged = this._hass && this._hass.connection !== hass.connection;
      this._hass = hass;
      if (!this._config) return;
      const state = hass.states[this._config.entity];
      const changed = this._lastState !== state;
      this._lastState = state;
      if (changed || connectionChanged || !this._loaded) this._refresh();
    }
    connectedCallback() {
      this._timer = setInterval(() => {
        if (!document.hidden) this._refresh();
      }, 30000);
      this._onVisibility = () => { if (!document.hidden) this._refresh(); };
      document.addEventListener("visibilitychange", this._onVisibility);
      this._refresh();
    }
    disconnectedCallback() {
      clearInterval(this._timer);
      document.removeEventListener("visibilitychange", this._onVisibility);
      this._request++;
      this._loading = false;
    }
    getCardSize() {
      const rows = Math.ceil(this._visibleItems().length / (this._config?.columns || 2));
      return 2 + Math.ceil(rows * 1.8);
    }
    getGridOptions() { return { columns: 12, rows: "auto", min_columns: 3 }; }
    async _refresh() {
      if (!this.isConnected || !this._hass || !this._config || this._loading) return;
      const entity = this._config.entity;
      const state = this._hass.states[entity];
      if (!state || ["unavailable", "unknown"].includes(state.state)) {
        this._error = !state ? `Entity not found: ${entity}` : "The selected to-do list is unavailable.";
        this._render();
        return;
      }
      const request = ++this._request;
      this._loading = true;
      if (!this._loaded) this._render();
      try {
        const result = await this._hass.callWS({
          type: "call_service", domain: "todo", service: "get_items",
          target: { entity_id: entity }, service_data: {}, return_response: true
        });
        if (request !== this._request || !this.isConnected) return;
        const items = result?.response?.[entity]?.items;
        if (!Array.isArray(items)) throw new Error("Home Assistant returned an unexpected to-do response.");
        this._items = items;
        this._loaded = true;
        this._error = "";
      } catch (error) {
        if (request === this._request) this._error = message(error);
      } finally {
        if (request === this._request) {
          this._loading = false;
          // Keep typed values and focus intact during background refreshes.
          if (!this._draft) this._render();
        }
      }
    }
    _visibleItems() {
      const items = this._items.filter((item) => !this._config?.hide_completed || item.status !== "completed");
      return items.slice().sort((a, b) => {
        const completed = Number(a.status === "completed") - Number(b.status === "completed");
        if (completed) return completed;
        if (this._config?.sort === "borrower") {
          const borrower = (a.description || "").localeCompare(b.description || "");
          if (borrower) return borrower;
        }
        if (this._config?.sort === "due") {
          const due = this._dueTime(a.due) - this._dueTime(b.due);
          if (due && !Number.isNaN(due)) return due;
        }
        return (a.summary || "").localeCompare(b.summary || "");
      });
    }
    _timezone() {
      return this._hass?.locale?.time_zone === "server" ? this._hass.config?.time_zone : undefined;
    }
    _today() {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: this._timezone(), year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(new Date());
      const part = (type) => parts.find((p) => p.type === type).value;
      return `${part("year")}-${part("month")}-${part("day")}`;
    }
    _dueTime(due) {
      if (!due) return Infinity;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(due) ? new Date(`${due}T23:59:59`) : new Date(due);
      return Number.isNaN(date.getTime()) ? Infinity : date.getTime();
    }
    _overdue(item) {
      if (!item.due || item.status === "completed") return false;
      return /^\d{4}-\d{2}-\d{2}$/.test(item.due) ? item.due < this._today() : this._dueTime(item.due) < Date.now();
    }
    _formatDue(due) {
      if (!due) return "No due date";
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(due);
      const date = new Date(dateOnly ? `${due}T12:00:00` : due);
      if (Number.isNaN(date.getTime())) return due;
      return new Intl.DateTimeFormat(this._hass?.locale?.language || "en", {
        year: "numeric", month: "short", day: "numeric",
        ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit", timeZone: this._timezone() })
      }).format(date);
    }
    _dateInput(due) {
      if (!due) return "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(due)) return due;
      const date = new Date(due);
      if (Number.isNaN(date.getTime())) return "";
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: this._timezone(), year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(date);
      const part = (type) => parts.find((p) => p.type === type).value;
      return `${part("year")}-${part("month")}-${part("day")}`;
    }
    _open(item = null) {
      this._draft = {
        uid: item?.uid ?? null, summary: item?.summary || "", description: item?.description || "",
        due: this._dateInput(item?.due), originalDue: item?.due || null, dueChanged: false
      };
      this._formError = "";
      this._render();
      this.shadowRoot.querySelector('[name="summary"]')?.focus();
    }
    async _save(event) {
      event.preventDefault();
      if (this._busy || !this._draft) return;
      const form = this.shadowRoot.querySelector("form");
      if (!form.reportValidity()) return;
      const draft = { ...this._draft };
      const data = { description: draft.description.trim() };
      if (draft.uid !== null) {
        data.item = draft.uid;
        data.rename = draft.summary.trim();
        // Preserve an existing datetime unless the user explicitly changes its date.
        if (draft.dueChanged) data.due_date = draft.due || null;
      } else {
        data.item = draft.summary.trim();
        if (draft.due) data.due_date = draft.due;
      }
      if (!data.item || !(data.rename ?? data.item).trim() || !data.description) {
        this._formError = "Enter both an item name and a borrower.";
        this._render();
        return;
      }
      const generation = this._generation;
      const entity = this._config.entity;
      this._busy = true;
      this._formError = "";
      this._render();
      try {
        await this._hass.callService("todo", draft.uid !== null ? "update_item" : "add_item", data, { entity_id: entity });
        if (generation !== this._generation) return;
        this._draft = null;
        this._error = "";
        this._request++;
        this._loading = false;
        await this._refresh();
      } catch (error) {
        if (generation === this._generation) this._formError = message(error);
      } finally {
        this._busy = false;
        this._render();
      }
    }
    async _toggle(item) {
      if (this._busy || !item.uid) return;
      const generation = this._generation;
      this._busy = true;
      this._render();
      try {
        await this._hass.callService("todo", "update_item", {
          item: item.uid, status: item.status === "completed" ? "needs_action" : "completed"
        }, { entity_id: this._config.entity });
        if (generation !== this._generation) return;
        this._request++;
        this._loading = false;
        await this._refresh();
      } catch (error) {
        if (generation === this._generation) this._error = message(error);
      } finally {
        this._busy = false;
        this._render();
      }
    }
    _render() {
      if (!this._config || !this.shadowRoot) return;
      const e = escapeHTML;
      const items = this._visibleItems();
      const active = this._items.filter((item) => item.status !== "completed").length;
      const disabled = this._busy ? "disabled" : "";
      this.shadowRoot.innerHTML = `
        <style>${LendingCard.styles}</style>
        <ha-card>
          <header>
            <div class="heading">${icon("handshake-outline")}<div><h2>${e(this._config.title)}</h2>
              <span class="secondary">${active} on loan</span></div></div>
            <div class="toolbar">
              <button class="icon-button" id="refresh" title="Refresh" aria-label="Refresh" ${disabled}>${icon("refresh")}</button>
              <button class="add" id="add" aria-label="Add loan" ${disabled}>${icon("plus")}<span>Add loan</span></button>
            </div>
          </header>
          ${this._error ? `<div class="error" role="alert">${e(this._error)}</div>` : ""}
          ${this._draft ? this._renderForm() : ""}
          ${!this._loaded && this._loading ? '<div class="empty" role="status">Loading loans…</div>' : ""}
          <div class="tiles" style="--columns:${this._config.columns}">
            ${items.map((item, index) => {
              const returned = item.status === "completed";
              const overdue = this._overdue(item);
              return `<article class="tile ${returned ? "returned" : ""} ${overdue ? "overdue" : ""}">
                <div class="loan-details">
                  <h3>${e(item.summary)}</h3>
                  <div class="borrower">${e(item.description || "No borrower specified")}</div>
                  ${item.due ? `<div class="due ${overdue ? "late" : ""}">${overdue ? "Overdue &middot; " : "Due &middot; "}${e(this._formatDue(item.due))}</div>` : ""}
                </div>
                <div class="loan-actions">
                  <button class="icon-button edit" data-index="${index}" title="Edit loan" aria-label="Edit ${e(item.summary)}" ${disabled}>${icon("pencil-outline")}</button>
                  <button class="icon-button toggle" data-index="${index}" title="${returned ? "Undo return" : "Mark returned"}" aria-label="${returned ? "Undo return of" : "Mark returned:"} ${e(item.summary)}" ${disabled} ${!item.uid ? "disabled" : ""}>${icon(returned ? "undo-variant" : "check")}</button>
                </div>
              </article>`;
            }).join("")}
          </div>
          ${this._loaded && !items.length ? `<div class="empty">${icon("handshake-outline")}<p>${this._items.length ? "No outstanding loans." : "No loans yet. Add your first loan above."}</p></div>` : ""}
        </ha-card>`;
      this.shadowRoot.querySelector("#add").onclick = () => this._open();
      this.shadowRoot.querySelector("#refresh").onclick = () => this._refresh();
      this.shadowRoot.querySelectorAll(".edit").forEach((button) => {
        button.onclick = () => this._open(items[Number(button.dataset.index)]);
      });
      this.shadowRoot.querySelectorAll(".toggle").forEach((button) => {
        button.onclick = () => this._toggle(items[Number(button.dataset.index)]);
      });
      const form = this.shadowRoot.querySelector("form");
      if (form) {
        form.onsubmit = (event) => this._save(event);
        form.oninput = (event) => {
          const input = event.target;
          if (!input.name) return;
          this._draft[input.name] = input.value;
          if (input.name === "due") this._draft.dueChanged = true;
        };
        this.shadowRoot.querySelector("#cancel").onclick = () => { this._draft = null; this._render(); };
        form.onkeydown = (event) => {
          if (event.key === "Escape" && !this._busy) { this._draft = null; this._render(); }
        };
      }
    }
    _renderForm() {
      const d = this._draft;
      const e = escapeHTML;
      const disabled = this._busy ? "disabled" : "";
      return `<form aria-label="${d.uid !== null ? "Edit loan" : "Add loan"}">
        <h3>${d.uid !== null ? "Edit loan" : "Add loan"}</h3>
        <label>Item name<input name="summary" value="${e(d.summary)}" required maxlength="255" ${disabled}></label>
        <label>Borrower<input name="description" value="${e(d.description)}" required maxlength="1000" ${disabled}></label>
        <label>Due date <span class="secondary">(optional)</span><input type="date" name="due" value="${e(d.due)}" ${disabled}></label>
        ${d.originalDue?.includes("T") ? '<small>Existing due time is preserved unless you change the date.</small>' : ""}
        ${this._formError ? `<div class="error" role="alert">${e(this._formError)}</div>` : ""}
        <div class="form-actions"><button type="button" id="cancel" ${disabled}>Cancel</button><button class="primary" type="submit" ${disabled}>${this._busy ? "Saving…" : "Save loan"}</button></div>
      </form>`;
    }
    static get styles() { return `
      :host{container-type:inline-size;display:block;color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,inherit)}
      *{box-sizing:border-box}ha-card{overflow:hidden}header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 16px 16px}
      .heading,.toolbar,.borrower,.due,.status,.add,.tile-top{display:flex;align-items:center;gap:8px}.heading{gap:12px;min-width:0}.heading>ha-icon{color:var(--primary-color)}
      h2{font-size:20px;font-weight:500;line-height:1.3;margin:0;overflow-wrap:anywhere}h3{font-size:16px;font-weight:500;margin:10px 0 12px;overflow-wrap:anywhere}
      .secondary,small{color:var(--secondary-text-color);font-size:12px}.tiles{display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));gap:12px;padding:0 16px 16px}
      .tile{border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,12px);padding:12px;display:flex;flex-direction:column;background:var(--secondary-background-color)}
      .tile-top{justify-content:space-between}.item-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;color:var(--primary-color);background:rgba(var(--rgb-primary-color,3,169,244),.12)}
      .borrower{font-size:14px;overflow-wrap:anywhere}.borrower span,.due span{min-width:0}.borrower ha-icon,.due ha-icon{--mdc-icon-size:18px;flex-shrink:0}
      .due{font-size:12px;color:var(--secondary-text-color);margin:12px 0 16px}.late{color:var(--error-color)}.overdue{border-color:var(--error-color)}
      button{font:inherit;border:0;cursor:pointer;border-radius:20px;min-height:40px;padding:8px 12px;background:transparent;color:var(--primary-color)}
      button:focus-visible,input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}button:hover{background:rgba(var(--rgb-primary-color,3,169,244),.10)}
      button:disabled{opacity:.5;cursor:default}.icon-button{display:grid;place-items:center;width:40px;height:40px;padding:8px;flex-shrink:0}.icon-button ha-icon{--mdc-icon-size:20px}
      .status{justify-content:center;margin-top:auto;width:100%;font-size:13px;background:var(--card-background-color);border:1px solid var(--divider-color)}
      .returned{background:var(--disabled-color, #bdbdbd);background:color-mix(in srgb,var(--secondary-text-color) 8%,var(--card-background-color));color:var(--secondary-text-color)}
      .returned h3{text-decoration:line-through}.returned .item-icon,.returned button{color:var(--secondary-text-color)}.returned .item-icon{background:rgba(128,128,128,.12)}
      .empty{text-align:center;color:var(--secondary-text-color);padding:20px 16px 28px}.error{margin:0 16px 16px;padding:12px;border-radius:8px;color:var(--error-color);background:rgba(var(--rgb-error-color,219,68,55),.08);overflow-wrap:anywhere}
      form{margin:0 16px 16px;padding:16px;border:1px solid var(--divider-color);border-radius:12px}form h3{margin-top:0}label{display:block;font-size:13px;margin-bottom:14px}
      input{display:block;width:100%;margin-top:6px;min-height:44px;padding:10px 12px;font:inherit;color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px;color-scheme:light dark}
      .form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.primary{background:var(--primary-color);color:var(--text-primary-color,#fff)}form .error{margin:12px 0 0}
      .tiles{gap:8px}
      .tile{flex-direction:row;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;min-width:0}
      .loan-details{flex:1;min-width:0}
      .tile h3{margin:0;font-size:14px;font-weight:500;line-height:1.35;overflow-wrap:anywhere}
      .tile .borrower{display:block;margin-top:3px;font-size:12px;line-height:1.3;color:var(--secondary-text-color);overflow-wrap:anywhere}
      .tile .due{display:block;margin:4px 0 0;font-size:11px;line-height:1.3}
      .tile .due.late{color:var(--error-color)}
      .loan-actions{display:flex;flex-direction:column;align-items:center;gap:0;flex-shrink:0}
      .loan-actions .icon-button{width:32px;height:32px;min-height:32px;padding:6px}
      .loan-actions ha-icon{--mdc-icon-size:18px}
      .loan-actions .edit{color:var(--secondary-text-color)}
      .returned .loan-actions button{color:var(--secondary-text-color)}
      @container(max-width:450px){header{flex-wrap:wrap}.tiles{grid-template-columns:repeat(min(var(--columns),2),minmax(0,1fr))}.add span{display:none}.toolbar{margin-left:auto}}
      @container(max-width:330px){.tiles{grid-template-columns:1fr}}
    `; }
  }

  class LendingCardEditor extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: "open" }); }
    setConfig(config) { this._config = { ...DEFAULTS, ...config }; this._render(); }
    set hass(hass) { this._hass = hass; this._render(); }
    _render() {
      if (!this._hass || !this._config) return;
      if (!this._form) {
        this.shadowRoot.innerHTML = '<ha-form></ha-form><p style="color:var(--secondary-text-color);font-size:12px">The item name is the lent object. Its description is the borrower. Completing an item marks it as returned.</p>';
        this._form = this.shadowRoot.querySelector("ha-form");
        this._form.schema = [
          { name: "entity", required: true, selector: { entity: { domain: "todo" } } },
          { name: "title", selector: { text: {} } },
          { name: "hide_completed", selector: { boolean: {} } },
          { name: "columns", selector: { number: { min: 1, max: 4, step: 1, mode: "slider" } } },
          { name: "sort", selector: { select: { mode: "dropdown", options: [
            { value: "due", label: "Due date" }, { value: "item", label: "Item name" }, { value: "borrower", label: "Borrower" }
          ] } } }
        ];
        const labels = { entity: "To-do list", title: "Title", hide_completed: "Hide returned items", columns: "Tile columns", sort: "Sort loans by" };
        this._form.computeLabel = (schema) => labels[schema.name] || schema.name;
        this._form.addEventListener("value-changed", (event) => {
          event.stopPropagation();
          this._config = { ...this._config, ...event.detail.value };
          this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config: this._config }, bubbles: true, composed: true
          }));
        });
      }
      this._form.hass = this._hass;
      this._form.data = this._config;
    }
  }
  if (!customElements.get("lending-card-editor")) customElements.define("lending-card-editor", LendingCardEditor);
  if (!customElements.get("lending-card")) customElements.define("lending-card", LendingCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === "lending-card")) {
    window.customCards.push({ type: "lending-card", name: "Lending Card", preview: true,
      description: "Track lent items, borrowers and due dates using a Home Assistant to-do list." });
  }
  console.info(`%c LENDING CARD %c v${VERSION} `, "background:#03a9f4;color:white;font-weight:bold", "background:#eee;color:#333");
})();
