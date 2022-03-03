import chalk from "chalk";

export const defaultPromptOptions = {
    onCancel: (): void => {
        console.log(chalk.red("User canceled"));
        process.exit(1);
    }
};
