entity xyz is
end;

package util is
  type intFile is file of integer;
end package;

package generic_pkg is
generic (
  par : integer
  );
end package;