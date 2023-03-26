package test0 is
end package;
package body test0 is
  function getBar(fooGetter: integer) return integer is
  begin
    return fooGetter + 1;
  end function;

  procedure apple(foo: integer) is
  begin
      apple(getBar(foo));
      apple(getBar(fooGetter => foo));
      apple(foo => getBar(fooGetter => foo));
  end procedure;
end package body;
