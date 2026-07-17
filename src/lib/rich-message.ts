export type InputRichText = string | InputRichText[] | InputRichTextUrl;

export type InputRichTextUrl = {
	type: 'url';
	text: InputRichText;
	url: string;
};

export type InputRichBlock =
	| { type: 'paragraph'; text: InputRichText }
	| { type: 'heading'; text: InputRichText; size: number }
	| { type: 'pre'; text: InputRichText; language?: string }
	| {
			type: 'list';
			items: Array<{
				blocks: InputRichBlock[];
				value?: number;
				type?: '1';
			}>;
	  }
	| { type: 'blockquote'; blocks: InputRichBlock[]; credit?: InputRichText }
	| {
			type: 'table';
			cells: Array<
				Array<{
					text?: InputRichText;
					is_header?: true;
					align: 'left' | 'center' | 'right';
					valign: 'top' | 'middle' | 'bottom';
				}>
			>;
			is_bordered?: true;
			is_striped?: true;
	  };

export type InputRichMessage = {
	blocks: InputRichBlock[];
	is_rtl?: true;
	skip_entity_detection?: true;
};
