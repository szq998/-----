// debug
const DEBUG = true;
const LOG_DIR = 'assets/log';
// 贴子显示设置
const TITLE_FONT_SIZE = 13;
const ABSTRACT_FONT_SIZE = 10;
const IMAGE_HEIGHT = 26;
const MIN_ITEM_MARGIN = 1.5;
const ITEM_CONTENT_HEIGHT = TITLE_FONT_SIZE + IMAGE_HEIGHT;
const MIN_ITEM_HEIGHT = ITEM_CONTENT_HEIGHT + MIN_ITEM_MARGIN * 2;
// 整体显示设置
const BG_CONTENT_OPACITY_LIGHT = 0.1;
const BG_CONTENT_OPACITY_DARK = 0.15;
const WIDGET_TOP_BOTTOM_MARGIN = 7;
// 获取数据量的限制
const MAX_NUMBER_OF_POST = 20;
// 超时控制
const POST_INFO_TIMEOUT = 10000;
const IMAGE_TIMEOUT = 10000;
// 图片下载路径
const IMAGE_DOWNLOAD_DIR = 'assets/post-images';
// 默认设置
const DEFAULT_REFRESH_CIRCLE = 30;
// 小组件输入参数设置
const WIDGET_OPTION_PATH = 'widget-options.json';

module.exports = {
    ABSTRACT_FONT_SIZE,
    BG_CONTENT_OPACITY_LIGHT,
    BG_CONTENT_OPACITY_DARK,
    DEBUG,
    DEFAULT_REFRESH_CIRCLE,
    IMAGE_DOWNLOAD_DIR,
    IMAGE_HEIGHT,
    IMAGE_TIMEOUT,
    ITEM_CONTENT_HEIGHT,
    LOG_DIR,
    MAX_NUMBER_OF_POST,
    MIN_ITEM_HEIGHT,
    MIN_ITEM_MARGIN,
    POST_INFO_TIMEOUT,
    TITLE_FONT_SIZE,
    WIDGET_OPTION_PATH,
    WIDGET_TOP_BOTTOM_MARGIN,
};
