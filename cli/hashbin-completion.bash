# Bash completion for hashbin CLI
# Install: source this file, or copy to /etc/bash_completion.d/hashbin

_hashbin() {
    local cur prev words cword
    _init_completion || return

    local commands="stamp verify health"

    if [[ $cword -eq 1 ]]; then
        COMPREPLY=($(compgen -W "$commands" -- "$cur"))
        return
    fi

    local cmd="${words[1]}"

    case "$cmd" in
        stamp)
            case "$prev" in
                --token)
                    return ;;
            esac
            if [[ "$cur" == -* ]]; then
                COMPREPLY=($(compgen -W "--include-name --token" -- "$cur"))
            else
                _filedir
            fi
            ;;
        verify)
            case "$prev" in
                --algorithm)
                    COMPREPLY=($(compgen -W "auto md5 sha1 sha256 sha512" -- "$cur"))
                    return ;;
            esac
            if [[ "$cur" == -* ]]; then
                COMPREPLY=($(compgen -W "--algorithm" -- "$cur"))
            else
                _filedir
            fi
            ;;
        health)
            ;;
    esac
}

complete -F _hashbin hashbin
