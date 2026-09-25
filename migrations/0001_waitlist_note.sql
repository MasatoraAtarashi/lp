-- 無料プランの質問回答（またはプレミアム登録の区別）を1本のメモで残す。
-- email だけの既存行はそのまま。列が無い環境では API が email のみにフォールバックする。
ALTER TABLE `waitlist` ADD `note` text;
