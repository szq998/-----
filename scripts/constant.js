// debug
const DEBUG = true;
const LOG_DIR = 'log';
// 贴子显示设置
const TITLE_FONT_SIZE = 13; // 标题字体
const ABSTRACT_FONT_SIZE = 10; // 摘要字体
const TITLE_MINIMUM_SCALE_FACTOR = ABSTRACT_FONT_SIZE / TITLE_FONT_SIZE; // 标题字体的最小缩放
const IMAGE_HEIGHT = 26; // 图片高度
const TITLE_DETAIL_SPACING = 1; // 标题与摘要/图片的间距
const MIN_ITEM_MARGIN = 1; // 每个帖子的最小上下外边距
const ITEM_CONTENT_HEIGHT =
    TITLE_FONT_SIZE + TITLE_DETAIL_SPACING + IMAGE_HEIGHT; // 内容区域高度
const MIN_ITEM_HEIGHT = ITEM_CONTENT_HEIGHT + MIN_ITEM_MARGIN * 2; // 算上外边距后的最小高度
// 整体显示设置
const BG_CONTENT_OPACITY_LIGHT = 0.1; // 背景内容（更新时间）浅色模式下的透明度
const BG_CONTENT_OPACITY_DARK = 0.15; //  背景内容（更新时间）深色模式下的透明度
const WIDGET_TOP_BOTTOM_MARGIN = 7; // 小组件内容区域的整体上下外边距
// 获取贴子数量的限制
const MAX_NUMBER_OF_POST = 20;
// 超时控制
const POST_INFO_TIMEOUT = 10000;
const IMAGE_TIMEOUT = 10000;
// 图片下载路径
const IMAGE_DOWNLOAD_DIR = 'assets/post-images';
// 图片清理间隔时间
const IMAGE_CLEAR_INTERVAL = 7 * 24 * 60 * 60000; // 7 day
// 最大可加载的图片尺寸
const MAX_IMAGE_SIZE = 500 * 1000; // 500KB
// 默认刷新周期设置
const DEFAULT_REFRESH_CIRCLE = 30;
// 小组件输入参数配置文件
const WIDGET_OPTION_PATH = 'widget-options.json';

module.exports = {
    ABSTRACT_FONT_SIZE,
    BG_CONTENT_OPACITY_LIGHT,
    BG_CONTENT_OPACITY_DARK,
    DEBUG,
    DEFAULT_REFRESH_CIRCLE,
    IMAGE_CLEAR_INTERVAL,
    IMAGE_DOWNLOAD_DIR,
    IMAGE_HEIGHT,
    IMAGE_TIMEOUT,
    ITEM_CONTENT_HEIGHT,
    LOG_DIR,
    MAX_NUMBER_OF_POST,
    MAX_IMAGE_SIZE,
    MIN_ITEM_HEIGHT,
    MIN_ITEM_MARGIN,
    POST_INFO_TIMEOUT,
    TITLE_DETAIL_SPACING,
    TITLE_MINIMUM_SCALE_FACTOR,
    TITLE_FONT_SIZE,
    WIDGET_OPTION_PATH,
    WIDGET_TOP_BOTTOM_MARGIN,
};
