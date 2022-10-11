class Formatter {
    private pos: number = 0;
    constructor(public text: string) {

    }
    gotoChar(pos: number) {
        if (pos === -1) {
            this.pos = this.text.length - 1;
        } else {
            this.pos = pos;
        }
    }
    vhdlBeautifyRegion() {
        this.vhdlFixupWhitespaceRegion();
        // this.vhdlFixStatementRegion();
        // this.vhdlIndentRegion();
        // this.vhdlAlignRegion();
        // this.vhdlFixCaseRegion();
        // this.vhdlRemoveTrailingSpacesRegion();
        // Fix Tabs
        return this.text;
    }
    vhdlFixStatementRegion() {
        throw new Error("Method not implemented.");
    }
    vhdlIndentRegion() {
        throw new Error("Method not implemented.");
    }
    vhdlAlignRegion() {
        throw new Error("Method not implemented.");
    }
    vhdlFixCaseRegion() {
        throw new Error("Method not implemented.");
    }
    vhdlRemoveTrailingSpacesRegion() {
        throw new Error("Method not implemented.");
    }
    match: RegExpExecArray;
    matchStart: number;
    matchEnd: number;
    reSearchForward(re: RegExp | string) {
        if (typeof re === 'string') {
            re = new RegExp(re);
        }
        const match = re.exec(this.text.substring(this.pos));
        if (match === null) {
            return false;
        }
        this.matchStart = this.pos + match.index;
        this.matchEnd = this.matchStart + match[0].length;
        return true;
    }
    replaceMatch(replacement: string, subgroup?: number) {
        if (subgroup === undefined) {
            this.text = this.text.substring(0, this.matchStart) + replacement + this.text.substring(this.matchEnd);
        } else {
            let newReplacement = '';
            for (let i = 0; i < this.match.length; i++) {
                if (i === subgroup) {
                    newReplacement += replacement;
                } else {
                    newReplacement += this.match[i];
                }
            }
            this.text = this.text.substring(0, this.matchStart) + newReplacement + this.text.substring(this.matchEnd);
        }
        // TODO: Correct Cursor?
    }
    vhdlFixupWhitespaceRegion() {
        //         (goto - char end)
        //         (setq end(point - marker))


        //         ;; have no space before and one space after`,' and ';'
        //     (goto-char beg)
        this.gotoChar(0);
        //     (while (re-search-forward "\\(--.*\n\\|\"[^\"\n]*[\"\n]\\|'.'\\|\\\\[^\\\n]*[\\\n]\\)\\|\\(\\s-*\\([,;]\\)\\)" end t)
        //       (if (match-string 1)
        // 	  (goto-char (match-end 1))
        // 	(replace-match "\\3 " nil nil nil 2)))
        while (this.reSearchForward("\\(--.*\\n\\|\"[^\"\\n]*[\"\\n]\\|'.'\\|\\\\[^\\n]*[\\n]\\)\\|\\(\\s-*\\([,;]\\)\\)")) {
            this.gotoChar(this.matchEnd);
            this.replaceMatch(this.match[3], 2);
        }
        //     ;; have no space after `('
        //             (goto - char beg)
        this.gotoChar(0);
        //             (while (re - search - forward "\\(--.*\n\\|\"[^\"\n]*[\"\n]\\|'.'\\|\\\\[^\\\n]*[\\\n]\\)\\|\\((\\)\\s-+" end t)
        //         (if (match - string 1)
        //         (goto - char(match - end 1))
        //             (replace - match "\\2")))
        // while (this.reSearchForward("\\(--.*\n\\|\"[^\"\n]*[\"\n]\\|'.'\\|\\\\[^\\\n]*[\\\n]\\)\\|\\((\\)\\s-+")) {
        //     this.gotoChar(this.matchEnd);
        //     this.replaceMatch(this.match[3], 2);
        // }



        //         ;; have no space before `)'
        //     (goto-char beg)
        //     (while (re-search-forward "\\(--.*\n\\|\"[^\"\n]*[\"\n]\\|'.'\\|\\\\[^\\\n]*[\\\n]\\|^\\s-+\\)\\|\\s-+\\()\\)" end t)
        //       (if (match-string 1)
        // 	  (goto-char (match-end 1))
        // 	(replace-match "\\2")))
        //     ;; surround operator symbols by one space
        //     (goto-char beg)
        //     (while (re-search-forward "\\(--.*\n\\|\"[^\"\n]*[\"\n]\\|'.'\\|\\\\[^\\\n]*[\\\n]\\)\\|\\(\\([^/:<>=\n]\\)\\(:\\|\\??=\\|\\??<<\\|\\??>>\\|\\??<\\|\\??>\\|:=\\|\\??<=\\|\\??>=\\|=>\\|\\??/=\\|\\?\\?\\)\\([^=>\n]\\|$\\)\\)" end t)
        //       (if (or (match-string 1)
        // 	      (<= (match-beginning 0)  ; not if at boi
        // 		 (save-excursion (back-to-indentation) (point))))
        // 	  (goto-char (match-end 0))
        // 	(replace-match "\\3 \\4 \\5")
        // 	(goto-char (match-end 2))))
        //     ;; eliminate multiple spaces and spaces at end of line
        //     (goto-char beg)
        //     (while (or (and (looking-at "--.*\n") (re-search-forward "--.*\n" end t))
        // 	       (and (looking-at "--.*") (re-search-forward "--.*" end t))
        // 	       (and (looking-at "\"") (re-search-forward "\"[^\"\n]*[\"\n]" end t))
        // 	       (and (looking-at "\\s-+$") (re-search-forward "\\s-+$" end t)
        // 		    (progn (replace-match "" nil nil) t))
        // 	       (and (looking-at "\\s-+;") (re-search-forward "\\s-+;" end t)
        // 		    (progn (replace-match ";" nil nil) t))
        // 	       (and (looking-at "^\\s-+") (re-search-forward "^\\s-+" end t))
        // 	       (and (looking-at "\\s-+--") (re-search-forward "\\s-+" end t)
        // 		    (progn (replace-match "  " nil nil) t))
        // 	       (and (looking-at "\\s-+") (re-search-forward "\\s-+" end t)
        // 		    (progn (replace-match " " nil nil) t))
        // 	       (and (looking-at "-") (re-search-forward "-" end t))
        // 	       (re-search-forward "[^ \t\"-]+" end t))))
        //   (unless no-message (message "Fixing up whitespace...done")))
    }
}

const test = `asdasd,asdasd
asdasdasd ; 
asdasd`;
const formatter = new Formatter(test);
formatter.vhdlBeautifyRegion();
console.log(formatter.text);