---
Time-stamp: <2015-07-28 21:15:52 ()>
layout: default
title: "My Blog"
tagline: "Sporadic at best."

---

Here you will find the articles that I write ranging from technical
reports to mildly opinionated rants although as you can see there's
nothing here now. I'll get around to writing some eventually.

<ul>
  {% for post in site.posts %}
  <li>
    <div class="post-list-date">{{ post.date | date: "%B %e, %Y" }}</span>
	&mdash;
	<a href="{{ post.url }}">{{ post.title }}</a>
	<ul class="hide-bullet"><li>
	<span class="post-tags">
	{% for tag in post.tags %}
	  <span class="accent">{{ tag }}</span> &nbsp;
	  {% endfor %}
    </li></ul>
	</span>
  </li>
  {% endfor %}
</ul>


### Tags
<hr/>


<div class="tag-cloud">
   {% for tag in site.tags %}
      <a href="#posts-tag" id="{{ forloop.index }}" class="__tag" style="margin: 5px">{{ tag[0] }}</a>
      <ul id="list_{{ forloop.index }}" style="display:none;">
         {% for post in tag[1] %}
            <li><a href="{{ post.url }}">{{ post.title }}</a></li>
         {% endfor %}
      </ul>
   {% endfor %}
</div>

<div id ="posts-tags" class="post-list" style="margin: 50px;"></div>

<script type="text/javascript">
   $(function() {
      var minFont = 15.0,
          maxFont = 40.0,
          diffFont = maxFont - minFont,
          size = 0;
       
      {% assign max = 1.0 %}
      {% for tag in site.tags %}
         {% if tag[1].size > max %}
            {% assign max = tag[1].size %}
         {% endif %}
      {% endfor %}
            
      {% for tag in site.tags %}
         size = (Math.log({{ tag[1].size }}) / Math.log({{ max }})) * diffFont + minFont;
         $("#{{ forloop.index }}").css("font-size", size + "px");
      {% endfor %}

      $('.tag-cloud a[class^="__tag"]').click(function() {
         $('.post-list').empty();
         $('#list_' + $(this).attr('id')).each(function() {
            $('.post-list').append('<ul>' + $(this).html() + '</ul>');
         });
      });
   });
</script>

	  
