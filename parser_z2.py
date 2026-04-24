import os
import re
import urllib.request
from urllib.parse import unquote
from collections import defaultdict, Counter

URLS = [
 "https://github.com/zieng2/wl/raw/main/vless_lite.txt",
 "https://github.com/zieng2/wl/raw/main/vless_universal.txt",
]

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
OUTPUT_ROOT   = os.path.join(BASE_DIR, "zieng2")
COUNTRIES_DIR = os.path.join(OUTPUT_ROOT, "countries")
TRANSPORTS_DIR = os.path.join(OUTPUT_ROOT, "transports")
SECURITY_DIR  = os.path.join(OUTPUT_ROOT, "security")

COUNTRY_REPLACEMENTS = {
 "The Netherlands": "Netherlands",
 "United States":   "USA",
 "Türkiye":   "Turkey",
}

SUFFIX_RE = re.compile(r'\s*—\s*#\d+\s*$')


def fetch_lines(url):
 with urllib.request.urlopen(url) as r:
  return [unquote(line.decode("utf-8", errors="ignore")) for line in r]


def split_tag(line):
 if "#" in line:
  idx = line.index("#")
  return line[:idx], line[idx + 1:]
 return line, ""


def normalize_tag(tag):
 tag = SUFFIX_RE.sub("", tag).strip()
 ru_flag = "🇷🇺"
 if tag.startswith(ru_flag):
  if tag[len(ru_flag):].strip() != "Russia":
   tag = f"{ru_flag} Russia"
 for old, new in COUNTRY_REPLACEMENTS.items():
  tag = tag.replace(old, new)
 return tag


def get_country(tag):
 parts = tag.strip().split(None, 1)
 return parts[1].strip() if len(parts) == 2 else tag.strip()


def has_required_security(line):
 return "security=tls" in line or "security=reality" in line


def get_param(line, param):
 m = re.search(r"[?&]" + param + r"=([^&# ]+)", line)
 return m.group(1) if m else "unknown"


def sort_by_country_count(lines):
 tagged = [(get_country(split_tag(l)[1]), l) for l in lines]
 counts = Counter(c for c, _ in tagged)
 tagged.sort(key=lambda x: (-counts[x[0]], x[0].lower()))
 return [l for _, l in tagged]


def add_country_numbers(lines):
 country_total = Counter(get_country(split_tag(l)[1]) for l in lines)
 country_idx = defaultdict(int)
 result = []
 for line in lines:
  base, tag = split_tag(line)
  country = get_country(tag)
  country_idx[country] += 1
  if country_total[country] > 1:
   flag_part = tag[:len(tag) - len(country)].rstrip()
   new_tag = f"{flag_part} {country} {country_idx[country]}".strip()
  else:
   new_tag = tag
  result.append(f"{base}#{new_tag}")
 return result


def write_lines(path, lines):
 os.makedirs(os.path.dirname(path), exist_ok=True)
 with open(path, "w", encoding="utf-8", newline="") as f:
  f.write("\n".join(lines))


def clear_dir(path):
 if os.path.exists(path):
  for entry in os.scandir(path):
   if entry.is_file():
    os.remove(entry.path)
 else:
  os.makedirs(path, exist_ok=True)


def main():
 for d in (COUNTRIES_DIR, TRANSPORTS_DIR, SECURITY_DIR):
  clear_dir(d)

 raw_lines = []
 for url in URLS:
  raw_lines.extend(fetch_lines(url))

 normalized = []
 for line in raw_lines:
  line = line.rstrip("\n\r")
  if not line.startswith("vless://") or not has_required_security(line):
   continue
  base, tag = split_tag(line)
  normalized.append(f"{base}#{normalize_tag(tag)}")

 seen_bases = set()
 deduped = []
 for line in normalized:
  base, _ = split_tag(line)
  if base not in seen_bases:
   seen_bases.add(base)
   deduped.append(line)

 deduped = sort_by_country_count(deduped)

 write_lines(os.path.join(OUTPUT_ROOT, "vless.txt"), add_country_numbers(deduped))

 country_map = defaultdict(list)
 for line in deduped:
  country_map[get_country(split_tag(line)[1])].append(line)

 for country, lines in country_map.items():
  safe_name = re.sub(r'[^\w\s\-]', '', country).strip()
  write_lines(
   os.path.join(COUNTRIES_DIR, f"{safe_name}.txt"),
   add_country_numbers(sort_by_country_count(lines))
  )

 transport_map = defaultdict(list)
 for line in deduped:
  transport_map[get_param(line, "type")].append(line)

 for transport, lines in transport_map.items():
  write_lines(
   os.path.join(TRANSPORTS_DIR, f"{transport}.txt"),
   add_country_numbers(sort_by_country_count(lines))
  )

 security_map = defaultdict(list)
 for line in deduped:
  security_map[get_param(line, "security")].append(line)

 for sec, lines in security_map.items():
  write_lines(
   os.path.join(SECURITY_DIR, f"{sec}.txt"),
   add_country_numbers(sort_by_country_count(lines))
  )

if __name__ == "__main__":
 main()
