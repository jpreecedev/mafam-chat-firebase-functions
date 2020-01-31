const parseMessages = messages => {
  if (!messages) {
    return [];
  }

  return Object.keys(messages).map(key =>
    Object.assign({}, messages[key], { parentKey: key })
  );
};

exports.parseMessages = parseMessages;
