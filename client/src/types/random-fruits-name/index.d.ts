declare module "random-fruits-name" {
    function getRandomFruitsName(language: string, option?: { maxWords: number }): string;

    export = getRandomFruitsName;
}
