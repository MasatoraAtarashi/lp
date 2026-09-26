// Vite の ?raw インポートで HTML を文字列として読むための宣言（i18n 回帰テスト用）
declare module "*.html?raw" {
  const content: string;
  export default content;
}
