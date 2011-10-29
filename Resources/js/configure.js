/*
 * SimpLESS configuration module
 * 
 * Handles user configuring simpLESS
 * 
 * @author Michael Barrett
 */
var SimpLESS_Config = {
	
	/*
	 * The form shown to the user is based on this object. Each member represents a configurable option
	 */
	configurable_items: {
		show_love: {
			type: 'checkbox',
			label: 'Show some love?'
		},
		locale: {
			type: 'select',
			label: 'locale',
			options: [],
			data_source: 'get_locale_options'
		},
		minify_css: {
			type: 'checkbox',
			label: 'Do you want the CSS output to be minified?'
		}
	},
	/*
	 * Previously saved user config
	 */
	user_config: Titanium.JSON.parse(localStorage.getItem('simpLESS_user_config')),
	/*
	 * Gets a value for an option out of the config
	 * 
	 * @param string option Name of option to retrieve value for
	 */
	get_config_option: function(option)
	{
		return this.user_config[option];
	},
	/*
	 * Sets a value for an configurable option
	 * 
	 * @param string option Name of option to set value for
	 * @param mixed value Value of the option to save
	 */
	set_config_option: function(option,value)
	{
		this.user_config[option] = value;
		this.save_config();
	},
	/*
	 * Saves the modified configuration to localStorage
	 */
	save_config: function()
	{
		localStorage.setItem('simpLESS_user_config',Titanium.JSON.stringify(this.user_config));
	},
	/*
	 * Renders the config page configureable form elements
	 */
	render_config_page: function(container)
	{
		var sc = this, //localize global
			//generate HTML elements to be used
			html = $('<ul>'),
			li = $('<li>');
		
		//loop through all options and generate the correct HTML relevant to the option
		for (x in sc.configurable_items) {
			var item = sc.configurable_items[x],
				name = x,
				label = $('<label>')
							.text(item['label'])
							.attr('for',name),
				elem_li = li.clone(),
				e;
			
			//generate HTML based on option type parameter
			switch (item['type']) {			
				case 'checkbox':
					e = $('<input>',{
						name: name,
						id: name,
						type: 'checkbox',
						change: function(){
							var val = ($(this).is(':checked')) ? true : false;
							sc.set_config_option(this.name,val);
						}
					});
					
					//set default value
					var default_val = sc.get_config_option(name);
					if (default_val == true) {
						e.attr('checked','checked');
					}
						
					//append to li container
					elem_li.append(e);
					elem_li.append(label);
					
				break;
				case 'select':
					e = $('<select>',{
						name: name,
						id: name,
						change: function(){
							sc.set_config_option(this.name,this.value);
						}
					});
					
					//set options for select
					var data = (item['data_source'] !== '') ? sc[item['data_source']]() : item['options'];
					for (y in data) {
						var opt = $('<option>',{
							value: data[y],
							text: data[y],
							selected: (sc.get_config_option(name) == data[y]) ? true : false
						});
						e.append(opt);
					}
					
					//append to li container
					elem_li.append(label);
					elem_li.append(e);
				break;
			}
			
			//append generated HTML to the root UL element
			html.append(elem_li);
		}
		
		//add all generated HTML to supplied container element
		$(container).html(html);
	},
	/*
	 * Gets locale options from L10n.json to populate locale dropdown
	 */
	get_locale_options: function()
	{
		var L10n_file = Titanium.App.getHome() + '/Resources/L10n.json',
    		L10n_data = Titanium.Filesystem.getFile(L10n_file).open().read().toString(),
    		parsed_L10n = Titanium.JSON.parse(L10n_data),
    		options = [];
		
    	for (x in parsed_L10n) {
    		options.push(x);
    	}
    	
    	return options;
	}
}