import Node from '../node';
declare class Comment extends Node {
    text: string;
    options: {
        isLineComment: boolean;
    };
}
export default Comment;
