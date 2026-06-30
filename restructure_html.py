import codecs
from bs4 import BeautifulSoup
import copy

with codecs.open('index.html', 'r', 'utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

# 3. Create console-personal
layout_gestion = soup.find(id='console-gestion')
if layout_gestion and not soup.find(id='console-personal'):
    layout_personal = copy.copy(layout_gestion)
    layout_personal['id'] = 'console-personal'
    
    # Update title IDs in personal layout
    title = layout_personal.find(id='view-title')
    if title: title['id'] = 'personal-view-title'
    subtitle = layout_personal.find(id='view-subtitle')
    if subtitle: subtitle['id'] = 'personal-view-subtitle'
    time_badge = layout_personal.find(id='time-badge-gestion')
    if time_badge: time_badge['id'] = 'time-badge-personal'
    
    # Update Sidebar Logo in personal layout
    logo_subtitle = layout_personal.find('span', class_='logo-subtitle')
    if logo_subtitle:
        logo_subtitle.string = "Personal"
        
    status_indicator = layout_personal.find('div', class_='system-status')
    if status_indicator:
        spans = status_indicator.find_all('span')
        if len(spans) > 1:
            spans[1].string = "Liderazgo"
            spans[0]['style'] = "background-color: var(--secondary); box-shadow: 0 0 10px var(--secondary);"

    # Move tabs
    tabs_to_personal = ['view-objetivos', 'view-charlas', 'view-capacitaciones', 'view-tiempos']
    
    # Remove personal tabs from gestion, remove gestion tabs from personal
    for layout, is_personal in [(layout_gestion, False), (layout_personal, True)]:
        # Sidebar buttons
        sidebar_menu = layout.find('ul', class_='sidebar-menu')
        if sidebar_menu:
            for li in sidebar_menu.find_all('li'):
                btn = li.find('button')
                if btn:
                    target = btn.get('data-target')
                    if is_personal:
                        if target not in tabs_to_personal:
                            li.decompose()
                    else:
                        if target in tabs_to_personal:
                            li.decompose()
        
        # Sections
        main_content = layout.find('main', class_='main-content')
        if main_content:
            for sec in main_content.find_all('section', recursive=False):
                sec_id = sec.get('id')
                if is_personal:
                    if sec_id not in tabs_to_personal:
                        sec.decompose()
                else:
                    if sec_id in tabs_to_personal:
                        sec.decompose()
                        
    layout_gestion.insert_after(layout_personal)

with codecs.open('index_new.html', 'w', 'utf-8') as f:
    f.write(str(soup))
print("DOM restructuring completed.")
