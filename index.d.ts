declare module "votifier2-ts" {
    interface VoteOptions {
        host: string;
        port: number;
        token: string;
        vote: VoteData;
    }

    interface VoteData {
        username: string;
        address: string;
        timestamp: number;
        serviceName: string;
    }

    function vote(options: VoteOptions): Promise<unknown>;

    export default vote;
}
