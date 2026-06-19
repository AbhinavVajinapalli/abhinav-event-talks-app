import os
import re
import urllib.request
import xml.etree.ElementTree as ET
import html
import json
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "releases_cache.json")
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def strip_html(html_content):
    if not html_content:
        return ""
    # Replace block level elements with space to keep words separated
    s = re.sub(r'</?(p|div|h3|h4|li|ul|ol|br)[^>]*>', ' ', html_content)
    # Remove code blocks and code tags cleanly
    # (Optional: preserve contents, remove only tags)
    s = re.sub(r'<[^>]+>', '', s)
    # Decode HTML entities
    s = html.unescape(s)
    # Clean up whitespace
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def parse_feed():
    try:
        req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', ns)
        
        parsed_updates = []
        for entry in entries:
            date_str = entry.find('atom:title', ns).text
            updated_raw = entry.find('atom:updated', ns).text
            content_html = entry.find('atom:content', ns).text or ""
            link_el = entry.find('atom:link', ns)
            link_href = link_el.attrib.get('href') if link_el is not None else ""
            
            # Split the content html on <h3> tags to separate multiple updates for the same day
            parts = re.split(r'<h3>(.*?)</h3>', content_html)
            
            if len(parts) > 1:
                for i in range(1, len(parts), 2):
                    update_type = parts[i].strip()
                    update_html = parts[i+1].strip() if i+1 < len(parts) else ""
                    
                    # Strip out empty content
                    if not update_html:
                        continue
                        
                    clean_text = strip_html(update_html)
                    
                    # Generate a unique ID based on date and index to easily select/reference it
                    unique_id = f"{date_str.replace(' ', '_').lower()}_{update_type.lower()}_{i}"
                    
                    parsed_updates.append({
                        'id': unique_id,
                        'date': date_str,
                        'updated_iso': updated_raw,
                        'type': update_type,
                        'html_content': update_html,
                        'text_content': clean_text,
                        'link': link_href
                    })
            else:
                # Fallback if no <h3> tag found
                clean_text = strip_html(content_html)
                unique_id = f"{date_str.replace(' ', '_').lower()}_update_0"
                parsed_updates.append({
                    'id': unique_id,
                    'date': date_str,
                    'updated_iso': updated_raw,
                    'type': 'Update',
                    'html_content': content_html.strip(),
                    'text_content': clean_text,
                    'link': link_href
                })
        
        # Save to cache
        cache_data = {
            'last_fetched': datetime.now().isoformat(),
            'releases': parsed_updates
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
            
        return parsed_updates, None
    except Exception as e:
        return None, str(e)

def get_releases(force_refresh=False):
    # Try reading from cache if not forced refresh
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                # Verify structure
                if 'releases' in cache_data and 'last_fetched' in cache_data:
                    return cache_data['releases'], cache_data['last_fetched'], None
        except Exception:
            pass # Cache invalid/corrupted, parse feed instead
            
    releases, err = parse_feed()
    if err:
        # If feed fetch failed but cache exists, return cache as backup with error status
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    return cache_data['releases'], cache_data['last_fetched'], f"Failed to fetch fresh feed ({err}). Displaying cached data."
            except Exception:
                pass
        return None, None, err
        
    return releases, datetime.now().isoformat(), None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def api_releases():
    refresh = request.args.get('refresh', 'false').lower() == 'true'
    releases, last_fetched, err = get_releases(force_refresh=refresh)
    
    if err and not releases:
        return jsonify({'success': False, 'error': err}), 500
        
    return jsonify({
        'success': True,
        'last_fetched': last_fetched,
        'releases': releases,
        'warning': err # In case we fallback to cache on fetch failure
    })

if __name__ == '__main__':
    # Run the initial fetch on launch
    print("Pre-fetching release notes...")
    releases, _, err = get_releases()
    if err:
        print(f"Initial fetch error: {err}")
    else:
        print(f"Pre-fetched {len(releases)} release notes successfully.")
        
    app.run(debug=True, port=5000)
