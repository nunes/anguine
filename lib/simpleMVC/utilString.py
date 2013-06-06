import string

def lower_first_camel_word(word):
    """ puts the first word in a CamelCase Word in lowercase.

    I.e. CustomerID becomes customerID, XMLInfoTest becomes xmlInfoTest
    """
    newstr = ''
    swapped = word.swapcase()
    idx = 0

    # if it's all-caps, return an all-lowered version
    lowered = word.lower()

    if swapped == lowered:
        return lowered

    for c in swapped:
        if c in string.lowercase:
            newstr += c
            idx += 1
        else:
            break
    if idx < 2:
        newstr += word[idx:]
    else:
        newstr = newstr[:-1] + word[idx - 1:]

    return newstr

def empty_string(s):
    """ returns true if string is empty
    """
    if s is None:
        return ''
    else:
        return str(s)


def clean_line(s):
    """Return string stripped, and remove line return characters
    """
    return s.strip().replace("\n", "").replace("\r", "")
