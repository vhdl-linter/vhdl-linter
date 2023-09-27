package pkg_in_pkg is
  package p is
      package a is
    end a;
  end p;
  use p.all;
  use p.a.all;
end package;
