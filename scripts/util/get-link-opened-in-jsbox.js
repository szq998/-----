function getLinkOpenedInJSBox(url) {
    const script = `$objc("UIApplication").$sharedApplication().$delegate().$window().$rootViewController().$dismissViewControllerAnimated_completion(true, $block('void, void',()=>{$safari.open('${url}')}))`;
    return `jsbox://run?script=${encodeURIComponent(script)}`;
}

module.exports = getLinkOpenedInJSBox;
