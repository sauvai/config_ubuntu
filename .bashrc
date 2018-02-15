#!/bin/bash
#Bash peon

# Couleurs pour le prompt
DEFAULT="\[\e[00m\]"
BLACK="\[\e[30m\]"
RED="\[\e[31m\]"
GREEN="\[\e[32m\]"
ORANGE="\[\e[33m\]"
BLUE="\[\e[34m\]"
MAGENTA="\[\e[35m\]"
CYAN="\[\e[36m\]"
WHITE="\[\e[37m\]"

# Effets de texte (défaut, gras, souligné)
export DEF="\[\e[0;0m\]"
export BOLD="\[\e[1m\]"
export UNDER="\[\e[4m\]"

export PATH="/bin:/usr/bin/env:/sbin:/usr/bin:/usr/sbin:/usr/heimdal/bin:/usr/heimdal/sbin:/home/${USER}/.bin"

export EDITOR='emacs'
export TERM='xterm'
export PAGER='less'
export MAIL="/u/all/${USER}/mail/${USER}"

export HISTSIZE=10000
export HISTFILESIZE=10000
export HISTCONTROL=ignoreboth
shopt -s histappend

#Corrects typos (eg: cd /ect becomes cd /etc)
shopt -s cdspell
shopt -s dirspell

#Autocd
shopt -s autocd

#Resize ouput to fit window
shopt -s checkwinsize

#PS1
PS1="$BOLD$WHITE\@"
PS1+="$BOLD$RED\W "
PS1+="$GREEN\\$ "
PS1+="$DEF$DEFAULT"
export PS1

#export PS1="(\h) \\$ \W> " #default
#export PS1="\\$ " #classic
export SAVEHIST=1000
export WATCH='all'

alias c='cc.sh'
alias ll='ls -lh'
alias la='ls -lah'
alias j='jobs'
alias emacs='emacs -nw'
alias ne='emacs'

#------------Alias Perso------------#
alias z='zsh'
alias ..='cd ..'
alias mv='mv -i'
alias rm='rm -I'
alias h='history'
alias cp='cp -rfi'
alias tree='tree -C'
alias bin='cd ~/.bin'
alias pull='git pull'
alias b='ne ~/.bashrc'
alias file='nautilus .'
alias ls='ls --color=yes'
alias lg='ls | grep -n ""'
alias blih='~/.bin/blih.py'
alias net='chromium-browser'
alias grep='grep --color=always'
alias norme='norme.py * -nocheat'
alias install='sudo apt-get install'
alias ctemp='cp ~/sauvai_l/c\ templates/* .'
alias bsu='sudo emacs -nw ~/../../root/.bashrc'
alias up='sudo apt-get update && sudo apt-get upgrade'
alias sudo='sudo '

#Piscine
alias gc='gcc -Wall -Wextra -Werror -std=gnu99'


#LESS man page colors (makes Man pages more readable).
export LESS_TERMCAP_mb=$'\E[01;31m'
export LESS_TERMCAP_md=$'\E[01;31m'
export LESS_TERMCAP_me=$'\E[0m'
export LESS_TERMCAP_se=$'\E[0m'
export LESS_TERMCAP_so=$'\E[01;44;33m'
export LESS_TERMCAP_ue=$'\E[0m'
export LESS_TERMCAP_us=$'\E[01;32m'

if [ -f ${HOME}/.mybashrc ]
then
    . ${HOME}/.mybashrc
fi
