function getFileMTime(path) {
    const date = $objc('NSFileManager')
        .invoke('defaultManager')
        .invoke('attributesOfItemAtPath:error', $file.absolutePath(path), null)
        .invoke('objectForKey', 'NSFileCreationDate')
        .jsValue();
    return date instanceof Date ? date : null;
}

module.exports = getFileMTime;
