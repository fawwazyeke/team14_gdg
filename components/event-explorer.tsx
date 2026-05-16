"use client";

import { AuthButton } from "@/components/auth-button";
import { getDisplayCategory, getOrderedCategories } from "@/lib/events/categories";
import type { NormalizedEvent } from "@/lib/events/types";
import { CalendarDays, Check, ChevronDown, MapPin, RefreshCcw, Search, Sparkles, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  initialEvents: NormalizedEvent[];
  initialWindow: {
    from: string;
    to: string;
  };
};

type Filters = {
  city: "" | "seoul" | "tokyo";
  category: string;
  from: string;
  to: string;
  search: string;
  freeOnly: boolean;
  minSocialScore: number;
};

type DropdownOption<T extends string> = {
  label: string;
  value: T;
};

const cityOptions: DropdownOption<Filters["city"]>[] = [
  { label: "Both cities", value: "" },
  { label: "Seoul", value: "seoul" },
  { label: "Tokyo", value: "tokyo" }
];

const categoryOptions: DropdownOption<string>[] = [
  { label: "All categories", value: "" },
  { label: "Language", value: "language exchange" },
  { label: "Games", value: "game hobby board" },
  { label: "Outdoor", value: "hike walk run sports outdoor" },
  { label: "Culture", value: "culture festival art market" },
  { label: "Learning", value: "workshop class study seminar" },
  { label: "Mixers", value: "social party friends mixer" }
];

export function EventExplorer({ initialEvents, initialWindow }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"city" | "category" | null>(null);
  const [filters, setFilters] = useState<Filters>({
    city: "",
    category: "",
    from: initialWindow.from,
    to: initialWindow.to,
    search: "",
    freeOnly: false,
    minSocialScore: 3
  });

  const visibleEvents = useMemo(() => filterVisibleEvents(events, filters), [events, filters]);
  const groupedEvents = useMemo(() => groupEvents(visibleEvents), [visibleEvents]);

  async function fetchEvents(nextFilters = filters) {
    setLoading(true);
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(nextFilters)) {
      if (key === "category" || key === "search") {
        continue;
      }
      if (value !== "" && value !== false) {
        params.set(key, String(value));
      }
    }

    const response = await fetch(`/api/events?${params.toString()}`);
    const data = await response.json();
    setEvents(data.events ?? []);
    setOpenId(null);
    setLoading(false);
  }

  async function refreshEvents() {
    setRefreshing(true);
    await fetch("/api/events/refresh", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        city: filters.city || undefined,
        from: filters.from,
        to: filters.to
      })
    });
    await fetchEvents();
    setRefreshing(false);
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    const nextFilters = {
      ...filters,
      [key]: value
    };
    setFilters(nextFilters);

    if (key !== "category" && key !== "search") {
      void fetchEvents(nextFilters);
    }
  }

  return (
    <main className="app-shell">
      <header className="top-band">
        <div>
          <p className="eyebrow">Do / 道 / 도</p>
          <h1>Find the way back into the world.</h1>
        </div>
        <div className="top-actions">
          <button className="icon-button" onClick={refreshEvents} disabled={refreshing} title="Refresh events">
            <RefreshCcw size={16} />
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>
          <AuthButton />
        </div>
      </header>

      <section className="minimal-toolbar" aria-label="Event filters">
        <div className="search-box">
          <Search size={16} />
          <input value={filters.search} placeholder="Search events" onChange={(event) => updateFilter("search", event.target.value)} />
        </div>
        <Dropdown
          label="Location"
          name="city"
          openDropdown={openDropdown}
          options={cityOptions}
          value={filters.city}
          onOpenChange={setOpenDropdown}
          onChange={(value) => updateFilter("city", value)}
        />
        <Dropdown
          label="Category"
          name="category"
          openDropdown={openDropdown}
          options={categoryOptions}
          value={filters.category}
          onOpenChange={setOpenDropdown}
          onChange={(value) => updateFilter("category", value)}
        />
      </section>

      <section className="quick-filters" aria-label="Quick filters">
        <button className={filters.freeOnly ? "chip active" : "chip"} onClick={() => updateFilter("freeOnly", !filters.freeOnly)}>
          Free
        </button>
        <button className={filters.minSocialScore >= 4 ? "chip active" : "chip"} onClick={() => updateFilter("minSocialScore", filters.minSocialScore >= 4 ? 3 : 4)}>
          Best fit
        </button>
        <span>{loading ? "Loading" : `${visibleEvents.length} events near you`}</span>
      </section>

      <section className="event-feed" aria-live="polite">
        {groupedEvents.map((cityGroup) => (
          <section className="city-group" key={cityGroup.city}>
            <div className="group-heading">
              <h2>{cityLabel(cityGroup.city)}</h2>
              <span>{cityGroup.count}</span>
            </div>

            {cityGroup.categories.map((categoryGroup) => (
              <section className="category-group" key={`${cityGroup.city}-${categoryGroup.category}`}>
                <h3>{categoryGroup.category}</h3>
                {categoryGroup.events.map((event) => {
                  const eventKey = `${event.source}-${event.sourceEventId}`;
                  const isOpen = openId === eventKey;

                  return (
                    <article className={isOpen ? "event-row open" : "event-row"} key={eventKey}>
                      <button className="event-summary" onClick={() => setOpenId(isOpen ? null : eventKey)}>
                        <time dateTime={event.startAt}>{formatDateBlock(event)}</time>
                        <div className="event-copy">
                          <p>{event.organizerName}</p>
                          <h4>{event.title}</h4>
                          <span>{event.venueName}</span>
                        </div>
                        <span className="fit-pill">{event.socialScore}/5</span>
                      </button>

                      {isOpen ? (
                        <div className="event-details">
                          <p>{event.summary}</p>
                          <div className="detail-line">
                            <MapPin size={15} />
                            <span>{event.venueName}</span>
                          </div>
                          <div className="detail-line">
                            <CalendarDays size={15} />
                            <span>{formatEventTime(event)}</span>
                          </div>
                          <div className="detail-line">
                            <Sparkles size={15} />
                            <span>{event.socialReason}</span>
                          </div>
                          <div className="detail-line">
                            <UsersRound size={15} />
                            <span>{event.organizerName}</span>
                          </div>
                          <a href={event.sourceUrl} target="_blank" rel="noreferrer">
                            View event
                          </a>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            ))}
          </section>
        ))}

        {!loading && visibleEvents.length === 0 ? <p className="empty-state">No matches. Try both cities or all categories.</p> : null}
      </section>
    </main>
  );
}

function Dropdown<T extends string>({
  label,
  name,
  openDropdown,
  options,
  value,
  onChange,
  onOpenChange
}: {
  label: string;
  name: "city" | "category";
  openDropdown: "city" | "category" | null;
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  onOpenChange: (name: "city" | "category" | null) => void;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  const isOpen = openDropdown === name;

  return (
    <div className="combo" onKeyDown={(event) => event.key === "Escape" && onOpenChange(null)}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={isOpen ? "combo-trigger open" : "combo-trigger"}
        onClick={() => onOpenChange(isOpen ? null : name)}
        type="button"
      >
        <span>
          <small>{label}</small>
          {selected.label}
        </span>
        <ChevronDown size={16} />
      </button>
      {isOpen ? (
        <div className="combo-menu" role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className={option.value === value ? "combo-option selected" : "combo-option"}
              key={option.value || "all"}
              onClick={() => {
                onChange(option.value);
                onOpenChange(null);
              }}
              role="option"
              type="button"
            >
              <span>{option.label}</span>
              {option.value === value ? <Check size={15} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function groupEvents(events: NormalizedEvent[]) {
  const cities = ["seoul", "tokyo"] as const;

  return cities
    .map((city) => {
      const cityEvents = events.filter((event) => event.city === city);
      const categories = getOrderedCategories(cityEvents).map((category) => ({
        category,
        events: cityEvents.filter((event) => getDisplayCategory(event) === category)
      }));

      return {
        city,
        count: cityEvents.length,
        categories
      };
    })
    .filter((group) => group.count > 0);
}

function filterVisibleEvents(events: NormalizedEvent[], filters: Filters) {
  const search = filters.search.trim().toLowerCase();

  return events.filter((event) => {
    if (filters.category && getDisplayCategory(event) !== categoryLabelFromFilter(filters.category)) {
      return false;
    }

    if (search) {
      const haystack = `${event.title} ${event.description} ${event.category} ${event.socialTags.join(" ")} ${event.venueName}`.toLowerCase();
      if (!search.split(/\s+/).every((term) => haystack.includes(term))) {
        return false;
      }
    }

    return true;
  });
}

function categoryLabelFromFilter(value: string) {
  const map: Record<string, ReturnType<typeof getDisplayCategory>> = {
    "language exchange": "Language Exchange",
    "game hobby board": "Games & Hobbies",
    "hike walk run sports outdoor": "Outdoor & Sports",
    "culture festival art market": "Culture & Festivals",
    "workshop class study seminar": "Workshops & Learning",
    "social party friends mixer": "Social Mixers"
  };

  return map[value] ?? "Community Events";
}

function cityLabel(city: "seoul" | "tokyo") {
  return city === "seoul" ? "Seoul" : "Tokyo";
}

function formatEventTime(event: NormalizedEvent) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: event.timezone
  }).format(new Date(event.startAt));
}

function formatDateBlock(event: NormalizedEvent) {
  const parts = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    timeZone: event.timezone
  })
    .formatToParts(new Date(event.startAt))
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.month ?? ""} ${parts.day ?? ""}`.trim();
}
