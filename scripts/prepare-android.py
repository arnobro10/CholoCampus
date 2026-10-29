"""Download verified build tools into the workspace, without changing system Java."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import shutil
from urllib.request import urlopen
import xml.etree.ElementTree as ET
from zipfile import ZipFile

base = Path(__file__).resolve().parents[1]
tools = base / '.build-tools'
tools.mkdir(exist_ok=True)

def fetch(url):
    with urlopen(url, timeout=60) as response:
        return response.read()

def archive(url, path, digest, algorithm='sha256'):
    if not path.exists() or hashlib.new(algorithm, path.read_bytes()).hexdigest() != digest:
        print('Downloading', path.name, flush=True)
        with urlopen(url, timeout=120) as response, path.open('wb') as out:
            shutil.copyfileobj(response, out)
    assert hashlib.new(algorithm, path.read_bytes()).hexdigest() == digest, 'Checksum mismatch'

def java():
    if list((tools / 'jdk').glob('*/bin/java.exe')):
        return
    releases = json.loads(fetch('https://api.github.com/repos/adoptium/temurin21-binaries/releases?per_page=8'))
    release = next(r for r in releases if any(a['name'].startswith('OpenJDK21U-jdk_x64_windows_hotspot_') and a['name'].endswith('.zip') for a in r['assets']))
    package = next(a for a in release['assets'] if a['name'].startswith('OpenJDK21U-jdk_x64_windows_hotspot_') and a['name'].endswith('.zip'))
    checksum_asset = next(a for a in release['assets'] if a['name'] == package['name'] + '.sha256.txt')
    checksum = fetch(checksum_asset['browser_download_url']).decode().split()[0]
    path = tools / 'jdk.zip'
    archive(package['browser_download_url'], path, checksum)
    with ZipFile(path) as z:
        z.extractall(tools / 'jdk')
    print('Java 21 ready', flush=True)

def android():
    sdk = tools / 'android-sdk'
    if (sdk / 'cmdline-tools/19.0/bin/sdkmanager.bat').exists():
        return
    root = ET.fromstring(fetch('https://dl.google.com/android/repository/repository2-1.xml'))
    package = next(p for p in root.findall('remotePackage') if p.get('path') == 'cmdline-tools;19.0')
    item = next(a for a in package.findall('archives/archive') if a.findtext('host-os') == 'windows')
    complete = item.find('complete')
    checksum = complete.find('checksum')
    path = tools / 'android-cli-19.zip'
    archive('https://dl.google.com/android/repository/' + complete.findtext('url'), path, checksum.text, checksum.get('type', 'sha1'))
    with ZipFile(path) as z:
        z.extractall(tools / 'android-unpack-19')
    (sdk / 'cmdline-tools').mkdir(parents=True, exist_ok=True)
    shutil.move(str(tools / 'android-unpack-19/cmdline-tools'), str(sdk / 'cmdline-tools/19.0'))
    print('Android command-line tools ready', flush=True)

with ThreadPoolExecutor(max_workers=2) as executor:
    for result in executor.map(lambda task: task(), [java, android]):
        pass

(base / 'android/local.properties').write_text('sdk.dir=' + (tools / 'android-sdk').as_posix() + '\n')
